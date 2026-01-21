import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoModule } from '@ngneat/transloco';
import { MatIconModule } from '@angular/material/icon';
import { OrderService } from '../../services/order.service';
import { Order } from '../../models/order.model';
import { HeaderCommonComponent } from '../shared/header-common.component';
import { QRCodeComponent } from 'angularx-qrcode';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, TranslocoModule, MatIconModule, HeaderCommonComponent, QRCodeComponent],
  templateUrl: './order-detail.component.html',
  styleUrls: ['./order-detail.component.css'],
})
export class OrderDetailComponent implements OnInit {
  order: Order | undefined = undefined;
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: OrderService,
    private location: Location,
  ) {}

  ngOnInit(): void {
    const orderId = this.route.snapshot.paramMap.get('id');
    if (orderId) {
      this.loadOrder(orderId);
    }
  }

  loadOrder(orderId: string): void {
    this.loading = true;
    this.orderService.getOrderById(orderId).subscribe({
      next: (order) => {
        this.order = order;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading order:', error);
        this.loading = false;
      },
    });
  }

  /**
   * Returns CSS classes for the status badge based on FHIR ServiceRequest status.
   */
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

  /**
   * Generates the data string for the QR code used for validation at the device.
   *
   * This implementation extracts the TaskID and AccessCode from the Gematik-compliant
   * FHIR extensions if available, or falls back to the internal Pickup Code.
   *
   * Format for validation endpoint: TaskID|AccessCode
   */
  get qrCodeData(): string {
    if (!this.order || !this.order.extension) {
      return this.order?.id || '';
    }

    const taskIdExt = this.order.extension.find(
      (ext) =>
        ext.url === 'https://gematik.de/fhir/erp/StructureDefinition/GEM_ERP_EXT_PrescriptionID',
    );
    const accessCodeExt = this.order.extension.find(
      (ext) => ext.url === 'https://gematik.de/fhir/erp/StructureDefinition/GEM_ERP_EXT_AccessCode',
    );

    // If both TaskID and AccessCode are present, use the validation format
    if (taskIdExt?.valueString && accessCodeExt?.valueString) {
      return `${taskIdExt.valueString}|${accessCodeExt.valueString}`;
    }

    // Fallback: Check for a dedicated Pickup Code extension
    const pickupCodeExt = this.order.extension.find(
      (ext) => ext.url === 'https://gematik.de/fhir/erp/StructureDefinition/GEM_ERP_EXT_PickupCode',
    );

    if (pickupCodeExt?.valueString) {
      return pickupCodeExt.valueString;
    }

    // Final fallback to the resource ID
    return this.order.id || '';
  }

  reorder(): void {
    if (this.order) {
      // TODO: Implement reorder functionality
      console.log('Reordering:', this.order);
      this.router.navigate(['/cart']);
    }
  }

  goBack(): void {
    this.location.back();
  }
}
