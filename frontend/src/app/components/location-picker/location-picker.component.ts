import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslocoModule } from '@ngneat/transloco';
import { MatIconModule } from '@angular/material/icon';
import { HeaderCommonComponent } from '../shared/header-common.component';
import { LocationMapComponent } from '../location-map/location-map.component';
import { VendingMachine } from '../../models/vending-machine.model';
import { VendingMachineService } from '../../services/vending-machine.service';
import { CartService } from '../../services/cart.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-location-picker',
  standalone: true,
  imports: [
    CommonModule,
    TranslocoModule,
    MatIconModule,
    HeaderCommonComponent,
    LocationMapComponent,
  ],
  templateUrl: './location-picker.component.html',
  styleUrls: ['./location-picker.component.css'],
})
export class LocationPickerComponent implements OnInit, OnDestroy {
  selectedMachine: VendingMachine | null = null;
  isCheckoutFlow = false;
  cartMedicationIds: string[] = [];
  availability: { allAvailable: boolean; unavailableItems: string[] } | null = null;
  checkingAvailability = false;
  private subscriptions = new Subscription();

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private vendingMachineService: VendingMachineService,
    private cartService: CartService,
    private location: Location,
  ) {}

  ngOnInit(): void {
    // Check if we're in checkout flow
    this.isCheckoutFlow = this.router.url.includes('/checkout');

    // Get any previously selected machine
    this.selectedMachine = this.vendingMachineService.getSelectedMachine();

    // Get cart items if in checkout flow
    if (this.isCheckoutFlow) {
      const cartSub = this.cartService.cartItems$.subscribe((items) => {
        this.cartMedicationIds = items
          .map((item) => item.medication.id)
          .filter((id): id is string => !!id);
      });
      this.subscriptions.add(cartSub);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  onMachineSelected(machine: VendingMachine | null): void {
    this.selectedMachine = machine;
    this.vendingMachineService.selectMachine(machine);

    // Check availability if in checkout flow and machine is selected
    if (this.isCheckoutFlow && machine && machine.id && this.cartMedicationIds.length > 0) {
      this.checkAvailability(machine);
    }
  }

  private checkAvailability(machine: VendingMachine): void {
    if (machine.status !== 'active') {
      this.availability = { allAvailable: false, unavailableItems: this.cartMedicationIds };
      return;
    }

    if (!machine.id) return;

    this.checkingAvailability = true;
    const availabilitySub = this.vendingMachineService
      .checkCartAvailability(machine.id, this.cartMedicationIds)
      .subscribe({
        next: (result) => {
          this.availability = result;
          this.checkingAvailability = false;
        },
        error: (error) => {
          console.error('Error checking availability:', error);
          this.checkingAvailability = false;
        },
      });
    this.subscriptions.add(availabilitySub);
  }

  confirmSelection(): void {
    if (this.selectedMachine) {
      if (this.isCheckoutFlow) {
        // Navigate to payment if in checkout flow
        this.router.navigate(['/checkout/payment']);
      } else {
        // Navigate back or to cart
        this.router.navigate(['/cart']);
      }
    }
  }

  goBack(): void {
    this.location.back();
  }
}
