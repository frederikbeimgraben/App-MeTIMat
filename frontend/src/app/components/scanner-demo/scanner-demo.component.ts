import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoModule } from '@ngneat/transloco';
import { AuthService } from '../../services/auth.service';

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
export class ScannerDemoComponent implements OnInit {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private router = inject(Router);

  locations = signal<Location[]>([]);
  selectedLocation = signal<Location | null>(null);
  qrData = signal<string>('');

  status = signal<'idle' | 'loading' | 'success' | 'error'>('idle');
  message = signal<string>('');
  lastOrder = signal<any | null>(null);

  ngOnInit(): void {
    // Check if admin
    if (!this.authService.isAdmin()) {
      this.router.navigate(['/']);
      return;
    }

    this.loadLocations();
  }

  loadLocations(): void {
    this.http.get<Location[]>('/api/v1/locations/').subscribe({
      next: (data) => {
        const machines = data.filter(l => l.location_type === 'vending_machine' && l.validation_key);
        this.locations.set(machines);
        if (machines.length > 0) {
          this.selectedLocation.set(machines[0]);
        }
      },
      error: (err) => {
        console.error('Failed to load locations', err);
        this.status.set('error');
        this.message.set('Fehler beim Laden der Automaten.');
      }
    });
  }

  onScan(): void {
    const location = this.selectedLocation();
    const qr = this.qrData().trim();

    if (!location || !qr) {
      this.status.set('error');
      this.message.set('Bitte Automat auswählen und QR-Code eingeben.');
      return;
    }

    this.status.set('loading');
    this.message.set('Validierung läuft...');
    this.lastOrder.set(null);

    const headers = new HttpHeaders({
      'X-Machine-Token': location.validation_key,
      'Content-Type': 'application/json'
    });

    const payload = { qr_data: qr };

    this.http.post<ValidationResponse>('/api/v1/orders/validate-qr', payload, { headers }).subscribe({
      next: (res) => {
        if (res.valid && res.order) {
          this.status.set('success');
          this.message.set(res.message || 'QR-Code gültig! Bestellung wird ausgegeben...');
          this.lastOrder.set(res.order);

          // Simulate machine dispensing and completing order
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
      }
    });
  }

  private completeOrder(location: Location, orderId: number): void {
    const headers = new HttpHeaders({
      'X-Machine-Token': location.validation_key,
      'Content-Type': 'application/json'
    });

    // Wait 2 seconds to simulate hardware action
    setTimeout(() => {
      this.http.post(`/api/v1/orders/${orderId}/complete`, {}, { headers }).subscribe({
        next: () => {
          this.message.set('Bestellung erfolgreich abgeschlossen und ausgegeben.');
        },
        error: (err) => {
          console.error('Completion error', err);
          this.message.set('Bestellung validiert, aber Abschluss-Signal fehlgeschlagen.');
        }
      });
    }, 2000);
  }

  getMedicationNames(order: any): string[] {
    const names: string[] = [];
    if (order.prescriptions) {
      order.prescriptions.forEach((p: any) => names.push(p.medication_name || 'Unbekanntes Rezept'));
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
    this.status.set('idle');
    this.message.set('');
    this.qrData.set('');
    this.lastOrder.set(null);
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
