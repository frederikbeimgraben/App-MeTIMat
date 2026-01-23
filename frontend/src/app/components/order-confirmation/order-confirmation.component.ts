import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';
import { TranslocoModule } from '@ngneat/transloco';
import { MatIconModule } from '@angular/material/icon';
import { QRCodeComponent } from 'angularx-qrcode';
import { HeaderCommonComponent } from '../shared/header-common.component';
import { OrderService } from '../../services/order.service';
import { Order } from '../../models/order.model';

@Component({
  selector: 'app-order-confirmation',
  standalone: true,
  imports: [CommonModule, TranslocoModule, MatIconModule, HeaderCommonComponent, QRCodeComponent],
  templateUrl: './order-confirmation.component.html',
  styleUrls: ['./order-confirmation.component.css'],
})
export class OrderConfirmationComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private orderService = inject(OrderService);

  order = signal<Order | null>(null);
  loading = signal(true);
  qrCodeData = signal<string>('');
  private pollingSubscription?: Subscription;
  private orderCompletedChime = new Audio('assets/sounds/chime.mp3');

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const orderId = params['orderId'];
      if (orderId) {
        this.startPolling(orderId);
      } else {
        this.loading.set(false);
      }
    });
  }

  ngOnDestroy(): void {
    this.pollingSubscription?.unsubscribe();
  }

  startPolling(id: string): void {
    this.loading.set(true);
    this.pollingSubscription = interval(3000)
      .pipe(
        startWith(0),
        switchMap(() => this.orderService.getOrderById(id)),
      )
      .subscribe({
        next: (order) => {
          if (order) {
            this.order.set(order);
            this.qrCodeData.set(order.access_token || order.id?.toString() || '');

            // Live redirect if order is completed
            if (order.status === 'completed') {
              this.pollingSubscription?.unsubscribe();
              this.orderCompletedChime.play();
              this.viewOrderDetails();
              return;
            }

            // Stop polling if cancelled
            if (order.status === 'cancelled') {
              this.pollingSubscription?.unsubscribe();
            }
          }
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error loading order:', err);
          this.loading.set(false);
        },
      });
  }

  viewOrderDetails(): void {
    const orderId = this.order()?.id;
    if (orderId) {
      this.router.navigate(['/orders', orderId], {
        queryParams: { fromConfirmation: 'true' },
        replaceUrl: true,
      });
    }
  }

  goHome(): void {
    this.router.navigate(['/home']);
  }
}
