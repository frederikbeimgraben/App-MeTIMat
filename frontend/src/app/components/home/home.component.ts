import { Component, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslocoModule } from '@ngneat/transloco';
import { MatIconModule } from '@angular/material/icon';
import { MedicationService } from '../../services/medication.service';
import { PrescriptionService } from '../../services/prescription.service';
import { OrderService } from '../../services/order.service';
import { ConsultationService } from '../../services/consultation.service';
import { Order } from '../../models/order.model';
import { Consultation } from '../../models/consultation.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, TranslocoModule, MatIconModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit {
  activeOrders: Order[] = [];
  activeConsultations: Consultation[] = [];
  loading = false;
  showSpecialtySelection = false;

  specialties = [
    'Allgemeinmedizin',
    'Innere Medizin',
    'Kardiologie',
    'Dermatologie',
    'Gynäkologie',
    'Orthopädie',
    'Neurologie',
    'Psychiatrie',
  ];

  constructor(
    private router: Router,
    private medicationService: MedicationService,
    private prescriptionService: PrescriptionService,
    private orderService: OrderService,
    private consultationService: ConsultationService,
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading = true;

    // Load active orders
    this.orderService.getActiveOrders().subscribe({
      next: (orders) => {
        this.activeOrders = orders;
      },
      error: (error) => {
        console.error('Error loading orders:', error);
      },
    });

    // Load active consultations
    this.consultationService.getActiveConsultations().subscribe({
      next: (consultations) => {
        this.activeConsultations = consultations;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading consultations:', error);
        this.loading = false;
      },
    });
  }

  startNewOrder(): void {
    // Show options to start order flow
    this.router.navigate(['/prescription/import']);
  }

  importPrescriptionNFC(): void {
    this.router.navigate(['/prescription/import']);
  }

  showMachineLocations(): void {
    // Show vending machine locations for pickup
    this.router.navigate(['/locations']);
  }

  viewMyOrders(): void {
    this.router.navigate(['/orders']);
  }

  viewMyPrescriptions(): void {
    this.router.navigate(['/prescriptions']);
  }

  viewOrder(orderId: string): void {
    this.router.navigate(['/orders', orderId]);
  }

  viewConsultation(consultationId: string): void {
    this.router.navigate(['/consultation', consultationId]);
  }

  startNewConsultation(): void {
    this.showSpecialtySelection = true;
  }

  selectSpecialty(specialty: string): void {
    this.showSpecialtySelection = false;
    this.consultationService.startNewConsultation(specialty).subscribe({
      next: (consultation) => {
        this.router.navigate(['/consultation', consultation.id]);
      },
      error: (error) => {
        console.error('Error starting consultation:', error);
      },
    });
  }

  viewAllOrders(): void {
    this.router.navigate(['/orders']);
  }

  viewAllConsultations(): void {
    this.router.navigate(['/consultations']);
  }

  getOrderStatusColor(status: string): string {
    switch (status) {
      case 'ready':
        return 'bg-green-100 text-green-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getConsultationStatusColor(status: string): string {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
}
