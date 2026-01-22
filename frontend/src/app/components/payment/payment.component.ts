import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslocoModule } from '@ngneat/transloco';
import { MatIconModule } from '@angular/material/icon';
import { HeaderCommonComponent } from '../shared/header-common.component';
import { CartService } from '../../services/cart.service';
import { OrderService } from '../../services/order.service';
import { VendingMachineService } from '../../services/vending-machine.service';
import { take } from 'rxjs';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, TranslocoModule, MatIconModule, HeaderCommonComponent],
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.css'],
})
export class PaymentComponent implements OnInit {
  private router = inject(Router);
  private cartService = inject(CartService);
  private orderService = inject(OrderService);
  private vendingMachineService = inject(VendingMachineService);

  cart = this.cartService.cart$;
  selectedMethod = signal<'creditCard' | 'healthInsurance' | null>(null);
  processing = signal(false);

  ngOnInit(): void {
    // Ensure a machine is selected, otherwise go back to location picker
    const machine = this.vendingMachineService.getSelectedMachine();
    if (!machine) {
      this.router.navigate(['/checkout/location']);
      return;
    }

    // Set default payment method for free orders
    this.cart.pipe(take(1)).subscribe((cartData) => {
      if (cartData.totalAmount <= 0) {
        this.selectedMethod.set('healthInsurance');
      }
    });
  }

  selectMethod(method: 'creditCard' | 'healthInsurance'): void {
    this.selectedMethod.set(method);
  }

  getItemName(item: any): string {
    return item.medication?.name || item.medication?.code?.coding?.[0]?.display || 'N/A';
  }

  getItemPrice(item: any): number {
    return this.cartService.getMedicationPrice(item.medication, !!item.prescription);
  }

  processPayment(): void {
    if (!this.selectedMethod() || this.processing()) return;

    this.processing.set(true);

    // 1. Create the order
    this.cart.pipe(take(1)).subscribe((cartData) => {
      // Prevent creating orders without items
      if (!cartData.items || cartData.items.length === 0) {
        this.processing.set(false);
        return;
      }

      const machine = this.vendingMachineService.getSelectedMachine();
      if (!machine || !machine.id) {
        this.processing.set(false);
        return;
      }

      const items = cartData.items.map((item) => ({
        medicationId: item.medication.id!,
        medicationName:
          (item.medication as any).name || item.medication.code?.coding?.[0]?.display || 'N/A',
        quantity: item.quantity,
        price: this.cartService.getMedicationPrice(item.medication, !!item.prescription),
      }));

      const prescriptionIds = cartData.items
        .filter((item) => item.prescription && item.prescription.id)
        .map((item) => item.prescription!.id);

      this.orderService.createOrder(items, machine.id, prescriptionIds).subscribe({
        next: (order) => {
          // 2. Mock payment delay
          setTimeout(() => {
            // 3. Confirm payment -> transitions to 'available for pickup'
            this.orderService.confirmPayment(order.id).subscribe(() => {
              this.cartService.clearCart();
              this.router.navigate(['/checkout/confirmation'], {
                queryParams: { orderId: order.id },
              });
            });
          }, 2000);
        },
        error: (err) => {
          console.error(err);
          this.processing.set(false);
        },
      });
    });
  }
}
