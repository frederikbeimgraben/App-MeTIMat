import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslocoModule } from '@ngneat/transloco';
import { MatIconModule } from '@angular/material/icon';
import { MedicationService } from '../../services/medication.service';
import { CartService } from '../../services/cart.service';
import { Medication } from '../../models/medication.model';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';

@Component({
  selector: 'app-medication-search',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoModule, MatIconModule],
  templateUrl: './medication-search.component.html',
  styleUrls: ['./medication-search.component.css'],
})
export class MedicationSearchComponent implements OnInit {
  searchTerm = '';
  medications: Medication[] = [];
  filteredMedications: Medication[] = [];
  loading = false;
  showPrescriptionOnly = false;
  selectedCategory: string = 'all';
  cartItems: Map<string, number> = new Map();
  private searchSubject = new Subject<string>();

  categories = [
    { value: 'all', label: 'Alle Kategorien' },
    { value: 'pain', label: 'Schmerzmittel' },
    { value: 'antibiotics', label: 'Antibiotika' },
    { value: 'allergy', label: 'Allergie' },
    { value: 'vitamins', label: 'Vitamine' },
    { value: 'cold', label: 'Erkältung' },
    { value: 'stomach', label: 'Magen-Darm' },
  ];

  constructor(
    private router: Router,
    private medicationService: MedicationService,
    private cartService: CartService,
    private location: Location,
  ) {}

  ngOnInit(): void {
    this.loadMedications();
    this.setupSearch();
    this.subscribeToCart();
  }

  setupSearch(): void {
    this.searchSubject.pipe(debounceTime(300), distinctUntilChanged()).subscribe((searchTerm) => {
      this.performSearch(searchTerm);
    });
  }

  loadMedications(): void {
    this.loading = true;
    this.medicationService.getAllMedications().subscribe({
      next: (medications) => {
        this.medications = medications;
        this.filteredMedications = medications;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading medications:', error);
        this.loading = false;
      },
    });
  }

  subscribeToCart(): void {
    this.cartService.cartItems$.subscribe((items) => {
      this.cartItems.clear();
      items.forEach((item) => {
        if (item.medication.id) {
          this.cartItems.set(item.medication.id, item.quantity);
        }
      });
    });
  }

  onSearchInput(): void {
    this.searchSubject.next(this.searchTerm);
  }

  public getMedicationName(med: Medication): string {
    return med.code?.text || med.code?.coding?.[0]?.display || 'Unknown Medication';
  }

  public getManufacturer(med: Medication): string {
    // In FHIR Medication, manufacturer is a Reference.
    return med.manufacturer?.display || 'N/A';
  }

  public getPzn(med: Medication): string {
    return (
      med.code?.coding?.find((c) => c.system === 'http://fhir.de/CodeSystem/ifa/pzn')?.code || ''
    );
  }

  public getPrice(med: Medication): number {
    const priceExt = med.extension?.find(
      (ext) => ext.url === 'http://metimat.de/fhir/StructureDefinition/medication-price',
    );
    if (priceExt && priceExt.valueMoney && priceExt.valueMoney.value) {
      return priceExt.valueMoney.value;
    }
    return (med as any).price || 0;
  }

  public getForm(med: Medication): string {
    return med.form?.text || 'N/A';
  }

  public getAmount(med: Medication): string {
    if (med.amount?.numerator) {
      return `${med.amount.numerator.value || ''} ${med.amount.numerator.unit || ''}`.trim();
    }
    return 'N/A';
  }

  public isAvailable(med: Medication): boolean {
    // Check status or custom extension
    return med.status === 'active';
  }

  performSearch(term: string): void {
    if (!term.trim()) {
      this.filteredMedications = this.filterByCategory(this.medications);
      return;
    }

    const searchLower = term.toLowerCase();
    const filtered = this.medications.filter((med) => {
      const name = this.getMedicationName(med).toLowerCase();
      const pzn = this.getPzn(med).toLowerCase();
      return name.includes(searchLower) || pzn.includes(searchLower);
    });

    this.filteredMedications = this.filterByCategory(filtered);
  }

  filterByCategory(medications: Medication[]): Medication[] {
    if (this.selectedCategory === 'all') {
      return medications;
    }

    return medications.filter((med) => {
      const name = this.getMedicationName(med).toLowerCase();
      switch (this.selectedCategory) {
        case 'pain':
          return (
            name.includes('ibuprofen') || name.includes('paracetamol') || name.includes('aspirin')
          );
        case 'antibiotics':
          return name.includes('amoxicillin') || name.includes('penicillin');
        case 'allergy':
          return name.includes('cetirizin') || name.includes('loratadin');
        case 'vitamins':
          return name.includes('vitamin');
        case 'cold':
          return name.includes('hustensaft') || name.includes('nasenspray');
        case 'stomach':
          return name.includes('pantoprazol') || name.includes('omeprazol');
        default:
          return true;
      }
    });
  }

  onCategoryChange(): void {
    this.performSearch(this.searchTerm);
  }

  togglePrescriptionFilter(): void {
    this.showPrescriptionOnly = !this.showPrescriptionOnly;
    this.performSearch(this.searchTerm);
  }

  addToCart(medication: Medication): void {
    this.cartService.addToCart(medication, 1);
  }

  removeFromCart(medication: Medication): void {
    if (medication.id) {
      this.cartService.removeFromCart(medication.id);
    }
  }

  updateQuantity(medication: Medication, quantity: string | number): void {
    const qty = typeof quantity === 'string' ? parseInt(quantity, 10) : quantity;
    if (!isNaN(qty) && medication.id) {
      this.cartService.updateQuantity(medication.id, qty);
    }
  }

  getCartQuantity(medicationId?: string): number {
    if (!medicationId) return 0;
    return this.cartItems.get(medicationId) || 0;
  }

  goToCart(): void {
    this.router.navigate(['/cart']);
  }

  goBack(): void {
    this.location.back();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.performSearch('');
  }
}
