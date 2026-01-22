import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { Prescription } from '../models/prescription.model';
import { MedicationService } from './medication.service';
import { CartService } from './cart.service';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class PrescriptionService {
  private prescriptionsSubject = new BehaviorSubject<Prescription[]>([]);
  public prescriptions$ = this.prescriptionsSubject.asObservable();

  constructor(
    private medicationService: MedicationService,
    private cartService: CartService,
    private http: HttpClient,
  ) {}

  /**
   * Helper to flatten FHIR data for frontend compatibility.
   */
  private flattenPrescription(p: Prescription): Prescription {
    if (p.fhir_data) {
      const dbId = p.id;
      return {
        ...p.fhir_data,
        ...p,
        id: dbId, // Ensure DB numeric ID takes precedence over FHIR string ID
      } as any as Prescription;
    }
    return p;
  }

  /**
   * Fetches all prescriptions for the current user.
   */
  getAllPrescriptions(): Observable<Prescription[]> {
    return this.http.get<Prescription[]>('/api/v1/prescriptions/').pipe(
      map((prescriptions) => prescriptions.map((p) => this.flattenPrescription(p))),
      tap((prescriptions) => this.prescriptionsSubject.next(prescriptions)),
      catchError((error) => {
        console.error('Error fetching prescriptions:', error);
        return throwError(() => new Error('Could not load prescriptions.'));
      }),
    );
  }

  /**
   * Imports prescriptions from an electronic health card (eGK).
   * Realistic mock path: /api/v1/prescriptions/import/egk
   */
  importFromEGK(): Observable<Prescription[]> {
    return this.http.post<Prescription[]>('/api/v1/prescriptions/import/egk', {}).pipe(
      map((prescriptions) => prescriptions.map((p) => this.flattenPrescription(p))),
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
   * Updates the status of a prescription.
   */
  updatePrescriptionStatus(id: string | number, status: string): Observable<Prescription> {
    return this.http.patch<Prescription>(`/api/v1/prescriptions/${id}/status/`, { status }).pipe(
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
   * Imports a prescription by scanning a QR code (E-Rezept).
   * Realistic mock path: /api/v1/prescriptions/import/scan
   */
  validateQrCode(qrContent: string): Observable<Prescription> {
    return this.http
      .post<Prescription>('/api/v1/prescriptions/import/scan', { qr_data: qrContent })
      .pipe(
        map((p) => this.flattenPrescription(p)),
        tap((imported) => {
          if (imported) {
            const current = this.prescriptionsSubject.value;
            if (!current.find((p) => p.id === imported.id)) {
              this.prescriptionsSubject.next([...current, imported]);
            }
          }
        }),
        catchError((error) => {
          console.error('QR Scan import error:', error);
          return throwError(() => new Error(error.error?.detail || 'QR scan import failed.'));
        }),
      );
  }

  /**
   * Helper to add medications from a prescription to the cart.
   */
  addPrescriptionMedicationsToCart(prescriptionId: string | number): Observable<boolean> {
    const prescription = this.prescriptionsSubject.value.find((p) => p.id === prescriptionId);
    if (!prescription) {
      return throwError(() => new Error('Prescription not found.'));
    }

    let medicationId: string | number | undefined = prescription.medication_id;

    // Fallback to FHIR reference if DB medication_id is not set
    if (!medicationId && (prescription as any).fhir_data?.medicationReference?.reference) {
      const ref = (prescription as any).fhir_data.medicationReference.reference;
      medicationId = ref.startsWith('Medication/') ? ref.split('/')[1] : ref;
    }

    if (!medicationId) {
      return throwError(() => new Error('Prescription does not reference a valid Medication.'));
    }

    return this.medicationService.getMedicationById(medicationId.toString()).pipe(
      map((medication) => {
        if (!medication) {
          throw new Error('Medication not found');
        }

        this.cartService.addToCart(medication, 1, prescription);
        return true;
      }),
      catchError((error) => {
        console.error('Error adding prescription to cart:', error);
        return throwError(() => new Error('Could not add prescription to cart.'));
      }),
    );
  }
}
