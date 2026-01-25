import { Component, OnInit, OnDestroy, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoModule } from '@ngneat/transloco';
import { AuthService } from '../../services/auth.service';
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';

interface Location {
  id: number;
  name: string;
  validation_key: string;
  location_type: string;
}

interface ValidationResponse {
  valid: boolean;
  order?: any;
  message?: string;
}

@Component({
  selector: 'app-scanner-demo',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, TranslocoModule],
  templateUrl: './scanner-demo.html',
})
export class ScannerDemoComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;

  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private router = inject(Router);

  locations = signal<Location[]>([]);
  selectedLocation = signal<Location | null>(null);

  status = signal<'idle' | 'scanning' | 'loading' | 'success' | 'error'>('idle');
  message = signal<string>('');
  lastOrder = signal<any | null>(null);

  private codeReader = new BrowserQRCodeReader();
  private scannerControls: IScannerControls | null = null;
  private beepAudio = new Audio('assets/sounds/beep.mp3');

  ngOnInit(): void {
    if (!this.authService.isAdmin()) {
      this.router.navigate(['/']);
      return;
    }
    this.loadLocations();
  }

  ngOnDestroy(): void {
    this.stopScanner();
  }

  loadLocations(): void {
    this.http.get<Location[]>('/api/v1/locations/').subscribe({
      next: (data) => {
        const machines = data.filter(
          (l) => l.location_type === 'vending_machine' && l.validation_key,
        );
        this.locations.set(machines);
        if (machines.length > 0) {
          this.selectedLocation.set(machines[0]);
        }
      },
      error: (err) => {
        console.error('Failed to load locations', err);
        this.status.set('error');
        this.message.set('Fehler beim Laden der Automaten.');
      },
    });
  }

  async startScanner(): Promise<void> {
    if (!this.selectedLocation()) {
      this.status.set('error');
      this.message.set('Bitte wählen Sie zuerst einen Automaten aus.');
      return;
    }

    this.status.set('scanning');
    this.message.set('Suche nach QR-Code...');
    this.lastOrder.set(null);

    try {
      this.scannerControls = await this.codeReader.decodeFromVideoDevice(
        undefined,
        this.videoElement.nativeElement,
        (result, error) => {
          if (result) {
            this.playBeep();
            this.onCodeScanned(result.getText());
          }
        },
      );
    } catch (err) {
      console.error('Scanner start error:', err);
      this.status.set('error');
      this.message.set('Kamera konnte nicht gestartet werden.');
    }
  }

  private stopScanner(): void {
    if (this.scannerControls) {
      this.scannerControls.stop();
      this.scannerControls = null;
    }
  }

  private playBeep(): void {
    this.beepAudio.play().catch((err) => console.warn('Could not play beep sound', err));
  }

  onCodeScanned(qrData: string): void {
    this.stopScanner();
    const location = this.selectedLocation();

    if (!location) return;

    this.status.set('loading');
    this.message.set('Validierung läuft...');

    const headers = new HttpHeaders({
      'X-Machine-Token': location.validation_key,
      'Content-Type': 'application/json',
    });

    const payload = { qr_data: qrData };

    this.http
      .post<ValidationResponse>('/api/v1/orders/validate-qr', payload, { headers })
      .subscribe({
        next: (res) => {
          if (res.valid && res.order) {
            this.status.set('success');
            this.message.set(res.message || 'QR-Code gültig! Bestellung wird ausgegeben...');
            this.lastOrder.set(res.order);
            this.completeOrder(location, res.order.id);
          } else {
            this.status.set('error');
            this.message.set(res.message || 'Ungültiger QR-Code.');
          }
        },
        error: (err) => {
          console.error('Validation error', err);
          this.status.set('error');
          this.message.set('Verbindungsfehler oder ungültiger Token.');
        },
      });
  }

  private completeOrder(location: Location, orderId: number): void {
    const headers = new HttpHeaders({
      'X-Machine-Token': location.validation_key,
      'Content-Type': 'application/json',
    });

    setTimeout(() => {
      this.http.post(`/api/v1/orders/${orderId}/complete`, {}, { headers }).subscribe({
        next: () => {
          this.message.set('Bestellung erfolgreich abgeschlossen und ausgegeben.');
        },
        error: (err) => {
          console.error('Completion error', err);
          this.message.set('Bestellung validiert, aber Abschluss-Signal fehlgeschlagen.');
        },
      });
    }, 2000);
  }

  getMedicationNames(order: any): string[] {
    const names: string[] = [];
    if (order.prescriptions) {
      order.prescriptions.forEach((p: any) =>
        names.push(p.medication_name || 'Unbekanntes Rezept'),
      );
    }
    if (order.medication_items) {
      order.medication_items.forEach((item: any) => {
        const name = item.medication?.name || 'Unbekannt';
        names.push(`${name} (x${item.quantity})`);
      });
    }
    return names;
  }

  reset(): void {
    this.stopScanner();
    this.status.set('idle');
    this.message.set('');
    this.lastOrder.set(null);
  }

  goBack(): void {
    this.stopScanner();
    this.router.navigate(['/']);
  }
}
