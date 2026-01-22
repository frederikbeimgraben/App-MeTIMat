import { Component, OnInit, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoModule } from '@ngneat/transloco';

@Component({
  selector: 'app-nfc-scanner',
  standalone: true,
  imports: [CommonModule, MatIconModule, TranslocoModule],
  template: `
    <div class="p-6 flex flex-col items-center justify-center min-h-[400px] text-center">
      <div class="mb-8">
        <div
          class="w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500"
          [class.bg-blue-100]="status() === 'idle'"
          [class.bg-green-100]="status() === 'scanning'"
          [class.bg-red-100]="status() === 'error'"
          [class.animate-pulse]="status() === 'scanning'"
        >
          <mat-icon class="text-blue-900" style="width: 64px; height: 64px; font-size: 64px"
            >nfc</mat-icon
          >
        </div>
      </div>

      <h2 class="text-2xl font-bold mb-2">
        @if (status() === 'idle') {
          Scan Prescription
        } @else if (status() === 'scanning') {
          Reading...
        } @else if (status() === 'success') {
          Prescription Added!
        } @else {
          NFC Error
        }
      </h2>

      <p class="text-gray-600 mb-8 max-w-xs">
        @if (status() === 'idle') {
          Hold your card or phone near the device to import your e-Prescription.
        } @else if (status() === 'scanning') {
          Please keep the device still...
        } @else if (status() === 'success') {
          The mock prescription has been successfully imported into your account.
        } @else {
          {{ errorMessage() }}
        }
      </p>

      @if (status() === 'idle') {
        <button
          (click)="startNfcScan()"
          class="bg-blue-900 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-blue-800 transition-colors"
        >
          Start Scanner
        </button>
      }

      @if (status() === 'success' || status() === 'error') {
        <button (click)="reset()" class="text-blue-900 font-medium underline">Try Again</button>
      }
    </div>
  `,
})
export class NfcScannerComponent implements OnInit, OnDestroy {
  status = signal<'idle' | 'scanning' | 'success' | 'error'>('idle');
  errorMessage = signal<string>('');
  private ndef: any = null;
  private ctrl: AbortController | null = null;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {}

  ngOnDestroy(): void {
    if (this.ctrl) {
      this.ctrl.abort();
    }
  }

  async startNfcScan() {
    if (!('NDEFReader' in window)) {
      this.errorMessage.set('NFC is not supported by your browser. Using Mock Mode.');
      this.mockNfcFlow();
      return;
    }

    try {
      this.status.set('scanning');
      this.ndef = new (window as any).NDEFReader();
      this.ctrl = new AbortController();

      await this.ndef.scan({ signal: this.ctrl.signal });

      this.ndef.onreading = (event: any) => {
        console.log('NFC Reading event:', event);
        this.addMockPrescription();
      };

      this.ndef.onreadingerror = () => {
        this.status.set('error');
        this.errorMessage.set('Cannot read NFC tag. Try again.');
      };
    } catch (error: any) {
      console.error(error);
      this.status.set('error');
      this.errorMessage.set(error.message || 'NFC Permission denied or hardware unavailable.');
    }
  }

  private mockNfcFlow() {
    this.status.set('scanning');
    // Simulate reading delay
    setTimeout(() => {
      this.addMockPrescription();
    }, 2000);
  }

  private addMockPrescription() {
    // AuthInterceptor handles token headers automatically
    this.http.post('/api/v1/prescriptions/import/scan', { qr_data: 'mock-nfc-token' }).subscribe({
      next: () => {
        this.status.set('success');
      },
      error: (err) => {
        this.status.set('error');
        this.errorMessage.set(
          err.error?.detail || 'Failed to create mock prescription. Is it enabled in .env?',
        );
      },
    });
  }

  reset() {
    this.status.set('idle');
    this.errorMessage.set('');
    if (this.ctrl) this.ctrl.abort();
  }
}
