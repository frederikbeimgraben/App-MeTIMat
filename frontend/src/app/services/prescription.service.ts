import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { Prescription } from '../models/prescription.model';
import { MedicationService } from './medication.service';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class PrescriptionService {
  private prescriptionsSubject = new BehaviorSubject<Prescription[]>([]);
  public prescriptions$ = this.prescriptionsSubject.asObservable();

  constructor(
    private medicationService: MedicationService,
    private http: HttpClient,
  ) {}

  /**
   * Fetches all prescriptions for the current user from the FHIR API.
   */
  getAllPrescriptions(): Observable<Prescription[]> {
    return this.http.get<Prescription[]>('/api/prescriptions').pipe(
      tap((prescriptions) => this.prescriptionsSubject.next(prescriptions)),
      catchError((error) => {
        console.error('Error fetching prescriptions:', error);
        return throwError(() => new Error('Could not load prescriptions.'));
      }),
    );
  }

  /**
   * Imports prescriptions from an electronic health card (eGK).
   * In a real TI environment, this would interface with a connector.
   */
  importFromEGK(): Observable<Prescription[]> {
    // This would typically be a specialized endpoint that triggers the eGK reading process
    return this.http.post<Prescription[]>('/api/prescriptions/import-egk', {}).pipe(
      tap((newPrescriptions) => {
        const current = this.prescriptionsSubject.value;
        this.prescriptionsSubject.next([...current, ...newPrescriptions]);
      }),
      catchError((error) => {
        console.error('Error importing from eGK:', error);
        return throwError(() => new Error('eGK import failed.'));
      }),
    );
  }

  /**
   * Updates the status of a MedicationRequest resource.
   */
  updatePrescriptionStatus(id: string, status: string): Observable<Prescription> {
    return this.http.patch<Prescription>(`/api/prescriptions/${id}/status`, { status }).pipe(
      tap((updated) => {
        const current = this.prescriptionsSubject.value;
        const index = current.findIndex((p) => p.id === id);
        if (index !== -1) {
          current[index] = updated;
          this.prescriptionsSubject.next([...current]);
        }
      }),
      catchError((error) => {
        console.error('Error updating prescription status:', error);
        return throwError(() => new Error('Status update failed.'));
      }),
    );
  }

  /**
   * Validates a prescription QR code (E-Rezept QR code).
   */
  validateQrCode(
    qrContent: string,
  ): Observable<{ success: boolean; data?: { fhir_resource: Prescription }; message?: string }> {
    return this.http
      .post<{
        success: boolean;
        data?: { fhir_resource: Prescription };
        message?: string;
      }>('/api/validate-qr', { qr_content: qrContent })
      .pipe(
        tap((response) => {
          if (response.success && response.data?.fhir_resource) {
            const current = this.prescriptionsSubject.value;
            const imported = response.data.fhir_resource;
            if (!current.find((p) => p.id === imported.id)) {
              this.prescriptionsSubject.next([...current, imported]);
            }
          }
        }),
        catchError((error) => {
          console.error('QR Validation error:', error);
          return throwError(() => new Error(error.error?.message || 'QR validation failed.'));
        }),
      );
  }

  /**
   * Import multiple prescriptions into the system.
   */
  importPrescriptions(prescriptions: Prescription[]): Observable<Prescription[]> {
    // Assuming a batch import endpoint or sequential posts
    return this.http.post<Prescription[]>('/api/prescriptions/batch', { prescriptions }).pipe(
      tap((imported) => {
        const current = this.prescriptionsSubject.value;
        this.prescriptionsSubject.next([...current, ...imported]);
      }),
    );
  }

  /**
   * Helper to add medications from a prescription to the cart.
   */
  addPrescriptionMedicationsToCart(prescriptionId: string): Observable<boolean> {
    const prescription = this.prescriptionsSubject.value.find((p) => p.id === prescriptionId);
    if (!prescription || !prescription.medicationReference) {
      return throwError(() => new Error('Prescription or medication not found.'));
    }

    // This logic might involve fetching the actual Medication resource if only a reference is present
    // For now, we assume the medication service can handle the reference or we have enough data.
    console.log(
      'Adding medication from prescription to cart:',
      prescription.medicationReference.display,
    );

    // Implementation depends on how CartService/MedicationService are structured
    // return this.cartService.addItemFromPrescription(prescription);
    return new Observable((observer) => {
      observer.next(true);
      observer.complete();
    });
  }
}
