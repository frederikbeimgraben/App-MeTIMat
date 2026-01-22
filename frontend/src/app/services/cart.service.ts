import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Medication } from '../models/medication.model';
import { Prescription } from '../models/prescription.model';

export interface CartItem {
  id: string;
  medication: Medication;
  quantity: number;
  prescription?: Prescription;
  addedAt: Date;
}

export interface Cart {
  items: CartItem[];
  totalAmount: number;
  prescriptionRequired: boolean;
  itemCount: number;
}

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private cartItemsSubject = new BehaviorSubject<CartItem[]>([]);
  public cartItems$ = this.cartItemsSubject.asObservable();

  public cart$: Observable<Cart> = this.cartItems$.pipe(
    map((items) => ({
      items,
      totalAmount: this.calculateTotal(items),
      prescriptionRequired: this.hasPrescriptionItems(items),
      itemCount: this.calculateItemCount(items),
    })),
  );

  constructor() {
    // Load cart from localStorage if available
    this.loadCartFromStorage();
  }

  private loadCartFromStorage(): void {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        const items = JSON.parse(savedCart);
        // Convert date strings back to Date objects
        items.forEach((item: CartItem) => {
          item.addedAt = new Date(item.addedAt);
        });
        this.cartItemsSubject.next(items);
      } catch (error) {
        console.error('Error loading cart from storage:', error);
        localStorage.removeItem('cart');
      }
    }
  }

  private saveCartToStorage(): void {
    const items = this.cartItemsSubject.value;
    localStorage.setItem('cart', JSON.stringify(items));
  }

  addToCart(medication: Medication, quantity: number = 1, prescription?: Prescription): void {
    const currentItems = this.cartItemsSubject.value;
    const medicationId = medication.id; // FHIR id is a string
    const existingItemIndex = currentItems.findIndex((item) => item.medication.id === medicationId);

    if (existingItemIndex > -1) {
      // Update quantity if item already exists
      const updatedItems = [...currentItems];
      updatedItems[existingItemIndex].quantity += quantity;
      updatedItems[existingItemIndex].quantity = Math.min(
        updatedItems[existingItemIndex].quantity,
        99,
      );
      this.cartItemsSubject.next(updatedItems);
    } else {
      // Add new item
      const newItem: CartItem = {
        id: `${medicationId}-${Date.now()}`,
        medication,
        quantity: Math.min(quantity, 99),
        prescription, // prescription will be a FHIR MedicationRequest
        addedAt: new Date(),
      };
      this.cartItemsSubject.next([...currentItems, newItem]);
    }
    this.saveCartToStorage();
  }

  updateQuantity(medicationId: string, quantity: number): void {
    const currentItems = this.cartItemsSubject.value;
    const itemIndex = currentItems.findIndex((item) => item.medication.id === medicationId);

    if (itemIndex > -1) {
      if (quantity <= 0) {
        // Remove item if quantity is 0 or negative
        this.removeFromCart(medicationId);
      } else {
        // Update quantity
        const updatedItems = [...currentItems];
        updatedItems[itemIndex].quantity = Math.min(quantity, 99);
        this.cartItemsSubject.next(updatedItems);
        this.saveCartToStorage();
      }
    }
  }

  removeFromCart(medicationId: string): void {
    const currentItems = this.cartItemsSubject.value;
    const filteredItems = currentItems.filter((item) => item.medication.id !== medicationId);
    this.cartItemsSubject.next(filteredItems);
    this.saveCartToStorage();
  }

  clearCart(): void {
    this.cartItemsSubject.next([]);
    localStorage.removeItem('cart');
  }

  getCartItem(medicationId: string): CartItem | undefined {
    return this.cartItemsSubject.value.find((item) => item.medication.id === medicationId);
  }

  getCartQuantity(medicationId: string): number {
    const item = this.getCartItem(medicationId);
    return item ? item.quantity : 0;
  }

  isInCart(medicationId: string): boolean {
    return this.cartItemsSubject.value.some((item) => item.medication.id === medicationId);
  }

  /**
   * Helper to extract price from FHIR extension.
   */
  public getMedicationPrice(medication: Medication, isPrescription: boolean = false): number {
    if (isPrescription) {
      // Calculate co-payment (Eigenanteil) for prescription items
      // Usually 10% of the price, min 5€, max 10€, but not more than the price itself
      const fullPrice = this.getMedicationPrice(medication, false);
      if (fullPrice <= 0) return 0;
      const coPayment = Math.max(5, Math.min(10, fullPrice * 0.1));
      return Math.min(fullPrice, coPayment);
    }

    const priceExt = medication.extension?.find(
      (ext) => ext.url === 'http://metimat.de/fhir/StructureDefinition/medication-price',
    );
    if (priceExt && priceExt.valueMoney && priceExt.valueMoney.value) {
      return priceExt.valueMoney.value;
    }
    // Fallback if we still have the non-standard 'price' property from earlier drafts or loose typing
    return (medication as any).price || 0;
  }

  private calculateTotal(items: CartItem[]): number {
    return items.reduce((total, item) => {
      const price = this.getMedicationPrice(item.medication, !!item.prescription);
      return total + price * item.quantity;
    }, 0);
  }

  private calculateItemCount(items: CartItem[]): number {
    return items.reduce((count, item) => count + item.quantity, 0);
  }

  private hasPrescriptionItems(items: CartItem[]): boolean {
    // Logic to check if any item requires prescription.
    // In a real app, we check if item.medication is flagged or if item.prescription is missing.
    // For now, assume if it has a prescription attached, it was required.
    // Or we check an extension on Medication "prescriptionRequired".
    return items.some((item) => !!item.prescription);
  }

  getPrescriptionItems(): Observable<CartItem[]> {
    return this.cartItems$.pipe(map((items) => items.filter((item) => !!item.prescription)));
  }

  getOTCItems(): Observable<CartItem[]> {
    return this.cartItems$.pipe(map((items) => items.filter((item) => !item.prescription)));
  }

  // Group items by prescription
  getItemsGroupedByPrescription(): Observable<Map<string, CartItem[]>> {
    return this.cartItems$.pipe(
      map((items) => {
        const grouped = new Map<string, CartItem[]>();
        items.forEach((item) => {
          if (item.prescription && item.prescription.id) {
            const key = item.prescription.id.toString();
            const current = grouped.get(key) || [];
            current.push(item);
            grouped.set(key, current);
          }
        });
        return grouped;
      }),
    );
  }

  // Check if cart has items that require prescription but don't have one attached
  hasUnfulfilledPrescriptionItems(): Observable<boolean> {
    // Placeholder logic: assume if we added it without prescription, it's fine for now unless flagged otherwise.
    // Real implementation would check Medication properties.
    return new Observable((obs) => obs.next(false));
  }

  // Attach prescription to items that need it
  attachPrescriptionToItems(prescription: Prescription, medicationIds: string[]): void {
    const currentItems = this.cartItemsSubject.value;
    const updatedItems = currentItems.map((item) => {
      // If the medication ID matches and we want to attach this prescription
      if (medicationIds.includes(item.medication.id || '')) {
        return { ...item, prescription };
      }
      return item;
    });
    this.cartItemsSubject.next(updatedItems);
    this.saveCartToStorage();
  }

  // Get total for specific items
  calculateSubtotal(items: CartItem[]): number {
    return items.reduce((total, item) => {
      const price = this.getMedicationPrice(item.medication, !!item.prescription);
      return total + price * item.quantity;
    }, 0);
  }
}
