import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslocoModule } from '@ngneat/transloco';
import { MatIconModule } from '@angular/material/icon';
import { OrderService } from '../../services/order.service';
import { Order } from '../../models/order.model';
import { HeaderCommonComponent } from '../shared/header-common.component';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, TranslocoModule, MatIconModule, HeaderCommonComponent],
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.css'],
})
export class OrdersComponent implements OnInit {
  orders: Order[] = [];
  activeOrders: Order[] = [];
  completedOrders: Order[] = [];
  loading = true;

  constructor(
    private router: Router,
    private orderService: OrderService,
  ) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.loading = true;
    this.orderService.getAllOrders().subscribe({
      next: (orders) => {
        this.orders = orders;
        // FHIR ServiceRequest status values: draft | active | on-hold | revoked | completed | entered-in-error | unknown
        this.activeOrders = orders.filter(
          (order) =>
            order.status === 'active' || order.status === 'on-hold' || order.status === 'draft',
        );
        this.completedOrders = orders.filter((order) => order.status === 'completed');
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading orders:', error);
        this.loading = false;
      },
    });
  }

  viewOrder(orderId?: string): void {
    if (orderId) {
      this.router.navigate(['/orders', orderId]);
    }
  }

  startNewOrder(): void {
    this.router.navigate(['/home']);
  }

  getStatusColor(orderStatus: string | undefined): string {
    switch (orderStatus) {
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'on-hold':
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'revoked':
      case 'entered-in-error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
}
