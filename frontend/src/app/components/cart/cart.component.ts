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
import { LocationService } from '../../services/location.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoModule, MatIconModule, HeaderCommonComponent],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css'],
})
export class CartComponent implements OnInit, OnDestroy {
  cart: Cart | null = null;
  groupedItems: { key: string; value: CartItem[] }[] = [];
  selectedMachine: VendingMachine | null = null;
  hasUnfulfilledPrescriptions = false;
  showClearConfirmation = false;

  private subscriptions = new Subscription();

  constructor(
    private router: Router,
    private cartService: CartService,
    private vendingMachineService: VendingMachineService,
    private locationService: LocationService,
  ) {}

  ngOnInit(): void {
    // Subscribe to cart changes and derive grouped items and prescription status
    const cartSub = this.cartService.cart$.subscribe((cart) => {
      this.cart = cart;

      // Group items manually to ensure sync and reactivity
      const groupedMap: { [key: string]: CartItem[] } = {};
      if (cart && cart.items) {
        cart.items.forEach((item) => {
          let key = 'otc';
          if (item.prescription && item.prescription.id) {
            key = item.prescription.id.toString();
          } else if (item.medication.prescription_required) {
            key = 'prescription-required';
          }

          if (!groupedMap[key]) {
            groupedMap[key] = [];
          }
          groupedMap[key].push(item);
        });
      }

      // Convert to array for stable template rendering and reactivity
      this.groupedItems = Object.keys(groupedMap).map((key) => ({
        key,
        value: groupedMap[key],
      }));

      // Check for unfulfilled prescriptions
      this.hasUnfulfilledPrescriptions = cart.items.some(
        (item) => item.medication.prescription_required && !item.prescription,
      );
    });
    this.subscriptions.add(cartSub);

    // Subscribe to selected vending machine changes
    const machineSub = this.vendingMachineService.selectedMachine$.subscribe((machine) => {
      this.selectedMachine = machine;
      if (!machine) {
        this.findAndSelectNearestMachine();
      }
    });
    this.subscriptions.add(machineSub);
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
    const medicationId = item.medication.id;
    if (!medicationId) return;

    if (item.quantity <= 1) {
      this.cartService.removeFromCart(medicationId);
    } else {
      this.cartService.updateQuantity(medicationId, item.quantity - 1);
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
      // Skip payment if total is 0
      const total = this.cart?.totalAmount || 0;
      if (total <= 0) {
        // Here we would normally call the service to complete the order directly
        // For now, let's navigate to the success page if it exists or just proceed
        this.router.navigate(['/checkout/payment']);
      } else {
        this.router.navigate(['/checkout/payment']);
      }
    }
  }

  private findAndSelectNearestMachine(): void {
    this.locationService.getUserLocation().subscribe((userLocation) => {
      if (!userLocation) {
        console.warn('Could not get user location to find nearest machine.');
        return;
      }

      this.vendingMachineService.getAllMachines().subscribe((machines) => {
        if (!machines || machines.length === 0) {
          console.warn('No vending machines available to select from.');
          return;
        }

        let nearestMachine: VendingMachine | null = null;
        let minDistance = Infinity;

        for (const machine of machines) {
          if (machine.position) {
            const distance = this.locationService.calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              machine.position.latitude,
              machine.position.longitude,
            );

            if (distance < minDistance) {
              minDistance = distance;
              nearestMachine = machine;
            }
          }
        }

        if (nearestMachine) {
          this.vendingMachineService.selectMachine(nearestMachine);
        }
      });
    });
  }

  getMedicationName(item: CartItem): string {
    return (
      (item.medication as any).name ||
      item.medication.code?.coding?.[0]?.display ||
      item.medication.code?.text ||
      'N/A'
    );
  }

  getManufacturer(item: CartItem): string {
    return (item.medication as any).manufacturer || item.medication.manufacturer?.display || 'N/A';
  }

  getDosageInfo(item: CartItem): string {
    const dosage = (item.medication as any).dosage_form || item.medication.form?.text || 'N/A';
    const size = (item.medication as any).package_size || 'N/A';
    return `${dosage} | ${size}`;
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
