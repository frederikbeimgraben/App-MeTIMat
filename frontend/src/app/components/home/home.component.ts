import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslocoModule } from '@ngneat/transloco';
import { MatIconModule } from '@angular/material/icon';
import { OrderService } from '../../services/order.service';
import { Order } from '../../models/order.model';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, TranslocoModule, MatIconModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit {
  activeOrders: Order[] = [];
  loading = false;

  constructor(
    private router: Router,
    private orderService: OrderService,
    public authService: AuthService,
  ) {}

  logout(): void {
    this.authService.logout();
  }

  goToAdmin(): void {
    this.router.navigate(['/admin']);
  }

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading = true;

    // Load active orders
    this.orderService.getActiveOrders().subscribe({
      next: (orders) => {
        this.activeOrders = orders;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading orders:', error);
        this.loading = false;
      },
    });
  }

  startNewOrder(): void {
    // Show options to start order flow
    this.router.navigate(['/prescription/import']);
  }

  importPrescriptionNFC(): void {
    this.router.navigate(['/prescription/scan']);
  }

  showMachineLocations(): void {
    // Show map with locations
    this.router.navigate(['/map']);
  }

  viewMyOrders(): void {
    this.router.navigate(['/orders']);
  }

  viewOrder(orderId: string | number | undefined): void {
    if (orderId) {
      this.router.navigate(['/orders', orderId]);
    }
  }

  viewAllOrders(): void {
    this.router.navigate(['/orders']);
  }

  getOrderStatusColor(status: string): string {
    switch (status) {
      case 'available for pickup':
      case 'ready':
        return 'bg-green-100 text-green-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
}
