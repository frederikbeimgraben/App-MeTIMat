import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router } from '@angular/router';
import { TranslocoModule } from '@ngneat/transloco';
import { MatIconModule } from '@angular/material/icon';
import { PrescriptionService } from '../../services/prescription.service';
import { Prescription } from '../../models/prescription.model';
import { HeaderCommonComponent } from '../shared/header-common.component';

@Component({
  selector: 'app-prescription-list',
  standalone: true,
  imports: [CommonModule, TranslocoModule, MatIconModule, HeaderCommonComponent],
  templateUrl: './prescription-list.component.html',
  styleUrls: ['./prescription-list.component.css'],
})
export class PrescriptionListComponent implements OnInit {
  prescriptions: Prescription[] = [];
  activePrescriptions: Prescription[] = [];
  loading = true;

  constructor(
    private router: Router,
    private prescriptionService: PrescriptionService,
    private location: Location,
  ) {}

  ngOnInit(): void {
    this.loadPrescriptions();
  }

  loadPrescriptions(): void {
    this.loading = true;
    this.prescriptionService.getAllPrescriptions().subscribe({
      next: (prescriptions) => {
        // FHIR MedicationRequest status values: active | on-hold | cancelled | completed | entered-in-error | stopped | draft | unknown
        this.activePrescriptions = prescriptions.filter((p) => p.status === 'active');
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading prescriptions:', error);
        this.loading = false;
      },
    });
  }

  selectPrescription(prescription: Prescription): void {
    if (prescription.id) {
      this.prescriptionService.addPrescriptionMedicationsToCart(prescription.id).subscribe({
        next: (success) => {
          if (success) {
            this.router.navigate(['/cart']);
          }
        },
        error: (error) => {
          console.error('Error adding prescription to cart:', error);
        },
      });
    }
  }

  goBack(): void {
    this.location.back();
  }
}
