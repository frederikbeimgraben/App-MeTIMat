import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';
import { TranslocoModule } from '@ngneat/transloco';
import { MatIconModule } from '@angular/material/icon';
import { OrderService } from '../../services/order.service';
import { Order } from '../../models/order.model';
import { HeaderCommonComponent } from '../shared/header-common.component';
import { QRCodeComponent } from 'angularx-qrcode';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [
    CommonModule,
    TranslocoModule,
    MatIconModule,
    HeaderCommonComponent,
    QRCodeComponent,
    RouterLink,
  ],
  templateUrl: './order-detail.component.html',
  styleUrls: ['./order-detail.component.css'],
})
export class OrderDetailComponent implements OnInit, OnDestroy {
  private _order = signal<Order | undefined>(undefined);
  private _loading = signal<boolean>(true);
  private _qrCodeData = signal<string>('');
  private pollingSubscription?: Subscription;

  // Expose signals for template access
  order = this._order.asReadonly();
  loading = this._loading.asReadonly();
  qrCodeData = this._qrCodeData.asReadonly();

  orderTotal = computed(() => {
    const order = this._order();
    if (!order) return '0.00 €';

    // If total_price is provided by backend, use it
    if (order.total_price !== undefined) {
      return `${order.total_price.toFixed(2)} €`;
    }

    // Fallback calculation
    let total = 0;
    if (order.prescriptions) {
      total += order.prescriptions.length * 5.0;
    }
    if (order.medications) {
      total += order.medications.reduce((sum, med) => sum + (med.price || 0), 0);
    }

    return `${total.toFixed(2)} €`;
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: OrderService,
    private location: Location,
  ) {}

  ngOnInit(): void {
    const orderId = this.route.snapshot.paramMap.get('id');
    if (orderId) {
      this.startPolling(orderId);
    }
  }

  ngOnDestroy(): void {
    this.pollingSubscription?.unsubscribe();
  }

  startPolling(orderId: string | number): void {
    this._loading.set(true);
    this.pollingSubscription = interval(3000)
      .pipe(
        startWith(0),
        switchMap(() => this.orderService.getOrderById(orderId)),
      )
      .subscribe({
        next: (order) => {
          if (order) {
            this._order.set({ ...order });
            this._qrCodeData.set(order.access_token || order.id?.toString() || '');
            this._loading.set(false);
            // Optional: stop polling if in final state
            if (order.status === 'completed' || order.status === 'cancelled') {
              this.pollingSubscription?.unsubscribe();
            }
          }
        },
        error: (error) => {
          console.error('Error loading order:', error);
          this._loading.set(false);
        },
      });
  }

  /**
   * Returns CSS classes for the status badge based on FHIR ServiceRequest status.
   */
  getStatusColor(orderStatus: string | undefined): string {
    switch (orderStatus) {
      case 'available for pickup':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  reorder(): void {
    if (this.order) {
      // TODO: Implement reorder functionality
      console.log('Reordering:', this.order);
      this.router.navigate(['/cart']);
    }
  }

  goBack(): void {
    if (this.route.snapshot.queryParamMap.get('fromConfirmation')) {
      this.router.navigate(['/orders']);
    } else {
      this.location.back();
    }
  }
}
