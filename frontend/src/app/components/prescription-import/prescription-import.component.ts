import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslocoModule } from '@ngneat/transloco';
import { MatIconModule } from '@angular/material/icon';
import { PrescriptionService } from '../../services/prescription.service';
import { HeaderCommonComponent } from '../shared/header-common.component';
import { MedicationService } from '../../services/medication.service';
import { Prescription } from '../../models/prescription.model';

@Component({
  selector: 'app-prescription-import',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoModule, MatIconModule, HeaderCommonComponent],
  templateUrl: './prescription-import.component.html',
  styleUrls: ['./prescription-import.component.css'],
})
export class PrescriptionImportComponent implements OnInit {
  isScanning = false;
  showSuccess = false;
  showError = false;
  errorMessage = '';
  importedCount = 0;
  activePrescriptions: Prescription[] = [];
  showPinInput = false;
  pinCode = '';
  pinError = false;

  constructor(
    private router: Router,
    private prescriptionService: PrescriptionService,
    private medicationService: MedicationService,
  ) {}

  ngOnInit(): void {
    this.loadActivePrescriptions();
  }

  loadActivePrescriptions(): void {
    this.prescriptionService.getAllPrescriptions().subscribe({
      next: (prescriptions) => {
        // FHIR MedicationRequest status is a primitive string in R4
        this.activePrescriptions = prescriptions.filter((p) => p.status === 'active');
      },
      error: (error) => {
        console.error('Error loading prescriptions:', error);
      },
    });
  }

  startNFCImport(): void {
    this.isScanning = true;
    this.showPinInput = false;
    this.pinCode = '';
    this.pinError = false;
    // Simulate NFC scanning - detect card
    setTimeout(() => {
      this.isScanning = false;
      this.showPinInput = true;
    }, 2000);
  }

  cancelNFCImport(): void {
    this.isScanning = false;
    this.showPinInput = false;
    this.pinCode = '';
    this.pinError = false;
  }

  submitPin(): void {
    if (this.pinCode.length !== 6) {
      this.pinError = true;
      return;
    }

    this.pinError = false;
    this.showPinInput = false;

    // Simulate PIN verification and data retrieval
    this.processNFCData();
  }

  onPinInput(event: any): void {
    const value = event.target.value.replace(/\D/g, '');
    if (value.length <= 6) {
      this.pinCode = value;
      this.pinError = false;
    }
  }

  processNFCData(): void {
    this.prescriptionService.importFromEGK().subscribe({
      next: (imported: Prescription[]) => {
        this.activePrescriptions = imported.filter((p) => p.status === 'active');

        if (this.activePrescriptions.length > 0) {
          this.importedCount = imported.length;
          this.showSuccess = true;
        } else {
          this.errorMessage = 'Keine verwendbaren Rezepte auf der Karte gefunden.';
          this.showError = true;
        }
      },
      error: (error: any) => {
        console.error('Error importing from eGK:', error);
        this.errorMessage = 'Fehler beim Lesen der eGK.';
        this.showError = true;
      },
    });
  }

  viewPrescriptions(): void {
    this.showSuccess = false;
  }

  closeError(): void {
    this.showError = false;
    this.errorMessage = '';
  }

  addPrescriptionToCart(prescription: Prescription): void {
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

  goToPrescriptionFree(): void {
    this.router.navigate(['/medication/search']);
  }

  getMedicationName(prescription: Prescription): string {
    return (
      prescription.medication_name ||
      prescription.medicationReference?.display ||
      prescription.medicationCodeableConcept?.text ||
      prescription.medicationCodeableConcept?.coding?.[0]?.display ||
      prescription.medication?.concept?.coding?.[0]?.display ||
      'Unbekanntes Medikament'
    );
  }
}
