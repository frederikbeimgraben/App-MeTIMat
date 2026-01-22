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
  selectedMethod = signal<'creditCard' | 'healthInsurance' | 'cashOnPickup' | null>(null);
  processing = signal(false);

  ngOnInit(): void {
    // Ensure a machine is selected, otherwise go back to location picker
    if (!this.vendingMachineService.getSelectedMachine()) {
      this.router.navigate(['/checkout/location']);
    }
  }

  selectMethod(method: 'creditCard' | 'healthInsurance' | 'cashOnPickup'): void {
    this.selectedMethod.set(method);
  }

  processPayment(): void {
    if (!this.selectedMethod()) return;

    this.processing.set(true);

    // 1. Create the order
    this.cart.pipe(take(1)).subscribe((cartData) => {
      const machine = this.vendingMachineService.getSelectedMachine();
      if (!machine || !machine.id) {
        this.processing.set(false);
        return;
      }

      const items = cartData.items.map((item) => ({
        medicationId: item.medication.id!,
        medicationName: item.medication.name!,
        quantity: item.quantity,
        price: (item.medication as any).price || 0,
      }));

      this.orderService.createOrder(items, machine.id).subscribe({
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
