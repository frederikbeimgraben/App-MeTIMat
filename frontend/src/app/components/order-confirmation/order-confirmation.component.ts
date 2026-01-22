import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
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
export class OrderConfirmationComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private orderService = inject(OrderService);

  order = signal<Order | null>(null);
  loading = signal(true);
  qrCodeData = '';

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const orderId = params['orderId'];
      if (orderId) {
        this.loadOrder(orderId);
      } else {
        this.loading.set(false);
      }
    });
  }

  loadOrder(id: string): void {
    this.orderService.getOrderById(id).subscribe({
      next: (order) => {
        if (order) {
          this.order.set(order);
          this.qrCodeData = order.access_token
            ? `METIMAT:${order.access_token}`
            : `ORDER:${order.id}`;
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
      this.router.navigate(['/orders', orderId]);
    }
  }

  goHome(): void {
    this.router.navigate(['/home']);
  }
}
