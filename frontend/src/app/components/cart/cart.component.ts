import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslocoModule } from '@ngneat/transloco';
import { MatIconModule } from '@angular/material/icon';
import { HeaderCommonComponent } from '../shared/header-common.component';
import { CartService, CartItem, Cart } from '../../services/cart.service';
import { VendingMachineService } from '../../services/vending-machine.service';
import { VendingMachine } from '../../models/vending-machine.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoModule, MatIconModule, HeaderCommonComponent],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css'],
})
export class CartComponent implements OnInit, OnDestroy {
  cart: Cart | null = null;
  groupedItems: Map<string, CartItem[]> = new Map();
  selectedMachine: VendingMachine | null = null;
  hasUnfulfilledPrescriptions = false;
  showClearConfirmation = false;

  private subscriptions = new Subscription();

  constructor(
    private router: Router,
    private cartService: CartService,
    private vendingMachineService: VendingMachineService,
  ) {}

  ngOnInit(): void {
    // Subscribe to cart changes
    const cartSub = this.cartService.cart$.subscribe((cart) => {
      this.cart = cart;
    });
    this.subscriptions.add(cartSub);

    // Subscribe to grouped items (will be empty map for now as per service refactoring)
    const groupedSub = this.cartService.getItemsGroupedByPrescription().subscribe((grouped) => {
      this.groupedItems = grouped;
    });
    this.subscriptions.add(groupedSub);

    // Check for unfulfilled prescriptions (will return true for now as per service refactoring)
    const prescriptionSub = this.cartService
      .hasUnfulfilledPrescriptionItems()
      .subscribe((hasUnfulfilled) => {
        this.hasUnfulfilledPrescriptions = hasUnfulfilled;
      });
    this.subscriptions.add(prescriptionSub);

    // Get selected vending machine
    // selectedMachine is now a FHIR Location (VendingMachine extends Location)
    this.selectedMachine = this.vendingMachineService.getSelectedMachine();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  updateQuantity(item: CartItem, event: Event): void {
    const input = event.target as HTMLInputElement;
    const quantity = parseInt(input.value, 10);

    if (!isNaN(quantity)) {
      const medicationId = item.medication.id;
      if (medicationId) {
        // Ensure medicationId is not undefined
        this.cartService.updateQuantity(medicationId, quantity);
      }
    }
  }

  increaseQuantity(item: CartItem): void {
    const newQuantity = Math.min(item.quantity + 1, 99);
    const medicationId = item.medication.id;
    if (medicationId) {
      // Ensure medicationId is not undefined
      this.cartService.updateQuantity(medicationId, newQuantity);
    }
  }

  decreaseQuantity(item: CartItem): void {
    const newQuantity = Math.max(item.quantity - 1, 0);
    const medicationId = item.medication.id;
    if (medicationId) {
      // Ensure medicationId is not undefined
      this.cartService.updateQuantity(medicationId, newQuantity);
    }
  }

  removeItem(item: CartItem): void {
    const medicationId = item.medication.id;
    if (medicationId) {
      // Ensure medicationId is not undefined
      this.cartService.removeFromCart(medicationId);
    }
  }

  clearCart(): void {
    this.showClearConfirmation = true;
  }

  confirmClearCart(): void {
    this.cartService.clearCart();
    this.showClearConfirmation = false;
  }

  cancelClearCart(): void {
    this.showClearConfirmation = false;
  }

  selectMachine(): void {
    this.router.navigate(['/location']);
  }

  addPrescription(): void {
    this.router.navigate(['/prescription/import']);
  }

  continueShopping(): void {
    this.router.navigate(['/medication/search']);
  }

  proceedToCheckout(): void {
    if (this.hasUnfulfilledPrescriptions) {
      // Show warning or redirect to prescription import
      this.router.navigate(['/prescription/import']);
    } else if (!this.selectedMachine) {
      // Redirect to vending machine selection
      this.router.navigate(['/location']);
    } else {
      // Proceed to payment
      this.router.navigate(['/checkout/payment']);
    }
  }

  getGroupTitle(key: string): string {
    switch (key) {
      case 'otc':
        return 'Rezeptfreie Artikel';
      case 'prescription-required':
        return 'Rezeptpflichtige Artikel (Rezept fehlt)';
      default:
        return `Rezept #${key.substring(0, 8)}`;
    }
  }

  getGroupIcon(key: string): string {
    switch (key) {
      case 'otc':
        return 'shopping_bag';
      case 'prescription-required':
        return 'warning';
      default:
        return 'description';
    }
  }

  getGroupClass(key: string): string {
    switch (key) {
      case 'otc':
        return 'bg-green-50 border-green-200';
      case 'prescription-required':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  }

  calculateSubtotal(items: CartItem[]): number {
    return this.cartService.calculateSubtotal(items);
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  }

  canCheckout(): boolean {
    return true;
  }
}
