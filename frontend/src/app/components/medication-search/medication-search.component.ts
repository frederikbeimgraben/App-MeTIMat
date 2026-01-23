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
        this.performSearch(this.searchTerm);
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

  public getMedicationName(med: any): string {
    return med.name || med.code?.text || med.code?.coding?.[0]?.display || 'Unknown Medication';
  }

  public getManufacturer(med: any): string {
    return med.manufacturer || med.manufacturer?.display || 'N/A';
  }

  public getPzn(med: any): string {
    return (
      med.pzn ||
      med.code?.coding?.find((c: any) => c.system === 'http://fhir.de/CodeSystem/ifa/pzn')?.code ||
      ''
    );
  }

  public getPrice(med: any): number {
    if (med.price !== undefined) return med.price;
    const priceExt = med.extension?.find(
      (ext: any) => ext.url === 'http://metimat.de/fhir/StructureDefinition/medication-price',
    );
    if (priceExt && priceExt.valueMoney && priceExt.valueMoney.value) {
      return priceExt.valueMoney.value;
    }
    return 0;
  }

  public getForm(med: any): string {
    if (med.dosage && med.dosage_form) {
      return `${med.dosage} ${med.dosage_form}`;
    }
    return med.dosage || med.dosage_form || med.form?.text || 'N/A';
  }

  public getAmount(med: any): string {
    if (med.package_size) return med.package_size;
    if (med.amount?.numerator) {
      return `${med.amount.numerator.value || ''} ${med.amount.numerator.unit || ''}`.trim();
    }
    return (med as any).pzn ? '1 Packung' : 'N/A';
  }

  public isAvailable(med: any): boolean {
    return med.status === 'active' || med.id !== undefined;
  }

  performSearch(term: string): void {
    const searchLower = term.toLowerCase().trim();

    let filtered = this.medications.filter((med) => {
      const name = this.getMedicationName(med).toLowerCase();
      const pzn = this.getPzn(med).toLowerCase();
      const manufacturer = this.getManufacturer(med).toLowerCase();
      return (
        name.includes(searchLower) ||
        pzn.includes(searchLower) ||
        manufacturer.includes(searchLower)
      );
    });

    filtered = this.filterByCategory(filtered);
    filtered = this.filterByPrescription(filtered);

    this.filteredMedications = filtered;
  }

  filterByCategory(medications: Medication[]): Medication[] {
    if (this.selectedCategory === 'all') {
      return medications;
    }

    return medications.filter((med: any) => {
      // Prioritize the actual category field from the backend
      if (med.category) {
        return med.category === this.selectedCategory;
      }

      // Fallback to name-based matching if category is missing
      const name = this.getMedicationName(med).toLowerCase();
      const manufacturer = this.getManufacturer(med).toLowerCase();
      const searchSpace = name + ' ' + manufacturer;

      switch (this.selectedCategory) {
        case 'pain':
          return (
            searchSpace.includes('ibuprofen') ||
            searchSpace.includes('paracetamol') ||
            searchSpace.includes('aspirin')
          );
        case 'antibiotics':
          return searchSpace.includes('amoxicillin') || searchSpace.includes('penicillin');
        case 'allergy':
          return searchSpace.includes('cetirizin') || searchSpace.includes('loratadin');
        case 'vitamins':
          return searchSpace.includes('vitamin');
        case 'cold':
          return (
            searchSpace.includes('hustensaft') ||
            searchSpace.includes('nasenspray') ||
            searchSpace.includes('grippe')
          );
        case 'stomach':
          return (
            searchSpace.includes('pantoprazol') ||
            searchSpace.includes('omeprazol') ||
            searchSpace.includes('magen')
          );
        default:
          return true;
      }
    });
  }

  filterByPrescription(medications: Medication[]): Medication[] {
    return medications.filter((med) => {
      const isPrescriptionRequired = (med as any).prescription_required === true;
      return isPrescriptionRequired === this.showPrescriptionOnly;
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
      const currentQty = this.getCartQuantity(medication.id);
      if (currentQty <= 1) {
        this.cartService.removeFromCart(medication.id);
      } else {
        this.cartService.updateQuantity(medication.id, currentQty - 1);
      }
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
