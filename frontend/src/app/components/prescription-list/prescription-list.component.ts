import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router } from '@angular/router';
import { TranslocoModule } from '@ngneat/transloco';
import { MatIconModule } from '@angular/material/icon';
import { PrescriptionService } from '../../services/prescription.service';
import { CartService } from '../../services/cart.service';
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
    private cartService: CartService,
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
        this.activePrescriptions = prescriptions
          .filter((p) => p.status === 'active')
          .map((p) => {
            const displayP = { ...p } as any;

            // Fix broken display by mapping 'medication' (CodeableReference) to 'medicationCodeableConcept'
            // This handles the data structure returned by the backend
            if (displayP.medication?.concept && !displayP.medicationCodeableConcept) {
              displayP.medicationCodeableConcept = displayP.medication.concept;
            }

            // Fix missing status translation by mapping 'active' to the existing translation key
            if (displayP.status === 'active') {
              displayP.status = 'prescription.active';
            }

            return displayP;
          });
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
      // Direct add to cart to handle data structure differences and avoid service constraints
      const pAny = prescription as any;
      const name = this.getMedicationName(pAny);

      // Create a temporary medication object for the cart
      const medication = {
        id: 'presc-' + prescription.id.toString(),
        name: name,
        pzn:
          pAny.medication?.concept?.coding?.[0]?.code ||
          pAny.medicationCodeableConcept?.coding?.[0]?.code ||
          '00000000',
        description: 'Importiert aus E-Rezept',
        is_active: true,
      } as any;

      this.cartService.addToCart(medication, 1, prescription);
      this.router.navigate(['/cart']);
    }
  }

  private getMedicationName(prescription: any): string {
    const name =
      prescription.medication?.concept?.coding?.[0]?.display ||
      prescription.medicationCodeableConcept?.coding?.[0]?.display ||
      prescription.medicationReference?.display ||
      'Unbekanntes Medikament';

    return name.length > 40 ? name.substring(0, 37) + '...' : name;
  }

  goBack(): void {
    this.location.back();
  }
}
