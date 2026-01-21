import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Medication, CartItem } from '../models/medication.model';
import { HttpClient, HttpParams } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class MedicationService {
  private cartSubject = new BehaviorSubject<CartItem[]>([]);
  public cart$ = this.cartSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Fetches all medications from the API.
   */
  getAllMedications(): Observable<Medication[]> {
    return this.http.get<Medication[]>('/api/medications').pipe(
      catchError((error) => {
        console.error('Error fetching medications:', error);
        return throwError(() => new Error('Could not load medications.'));
      }),
    );
  }

  /**
   * Searches for medications by name.
   */
  searchMedications(query: string): Observable<Medication[]> {
    const params = new HttpParams().set('name', query);
    return this.http.get<Medication[]>('/api/medications', { params }).pipe(
      catchError((error) => {
        console.error('Error searching medications:', error);
        return of([]);
      }),
    );
  }

  /**
   * Fetches a single medication by ID.
   */
  getMedicationById(id: string): Observable<Medication | undefined> {
    return this.http.get<Medication>(`/api/medications/${id}`).pipe(
      catchError((error) => {
        console.error(`Error fetching medication ${id}:`, error);
        return of(undefined);
      }),
    );
  }

  /**
   * Fetches prescription-free medications.
   * For now, this returns all medications as the backend distinction is not yet fully implemented.
   */
  getPrescriptionFreeMedications(): Observable<Medication[]> {
    return this.getAllMedications();
  }

  // --- Cart Management (Local State) ---

  getCartItems(): Observable<CartItem[]> {
    return this.cart$;
  }

  addToCart(medication: Medication, quantity: number, prescriptionId?: string): void {
    const currentCart = this.cartSubject.value;
    const existingItemIndex = currentCart.findIndex((item) => item.medication.id === medication.id);

    if (existingItemIndex >= 0) {
      currentCart[existingItemIndex].quantity += quantity;
      this.cartSubject.next([...currentCart]);
    } else {
      this.cartSubject.next([...currentCart, { medication, quantity, prescriptionId }]);
    }
  }

  removeFromCart(medicationId: string): void {
    const currentCart = this.cartSubject.value;
    const filtered = currentCart.filter((item) => item.medication.id !== medicationId);
    this.cartSubject.next(filtered);
  }

  updateCartItemQuantity(medicationId: string, quantity: number): void {
    const currentCart = this.cartSubject.value;
    const itemIndex = currentCart.findIndex((item) => item.medication.id === medicationId);

    if (itemIndex >= 0) {
      if (quantity <= 0) {
        this.removeFromCart(medicationId);
      } else {
        currentCart[itemIndex].quantity = quantity;
        this.cartSubject.next([...currentCart]);
      }
    }
  }

  clearCart(): void {
    this.cartSubject.next([]);
  }

  getCart(): CartItem[] {
    return this.cartSubject.value;
  }

  getCartTotal(): number {
    // Assuming we can extract price from FHIR resource extensions or custom fields if available.
    // Since strict FHIR Medication doesn't have a simple price field, we might need to rely on
    // an extension or assume the backend injects a temporary 'price' property if not strict.
    // For now, we'll try to access a 'price' property if it exists on the object (as defined in our Migration),
    // even though it's not standard FHIR R4.
    return this.cartSubject.value.reduce((total, item) => {
      const price = (item.medication as any).price || 0;
      return total + price * item.quantity;
    }, 0);
  }
}
