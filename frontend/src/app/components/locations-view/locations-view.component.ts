import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslocoModule } from '@ngneat/transloco';
import { MatIconModule } from '@angular/material/icon';
import { HeaderCommonComponent } from '../shared/header-common.component';
import { LocationMapComponent } from '../location-map/location-map.component';
import { VendingMachine } from '../../models/vending-machine.model';
import { VendingMachineService } from '../../services/vending-machine.service';

@Component({
  selector: 'app-locations-view',
  standalone: true,
  imports: [
    CommonModule,
    TranslocoModule,
    MatIconModule,
    HeaderCommonComponent,
    LocationMapComponent,
  ],
  templateUrl: './locations-view.component.html',
  styleUrls: ['./locations-view.component.css'],
})
export class LocationsViewComponent implements OnInit {
  selectedMachine: VendingMachine | null = null;

  constructor(
    private router: Router,
    private vendingMachineService: VendingMachineService,
  ) {}

  ngOnInit(): void {
    // Get any previously selected machine
    this.selectedMachine = this.vendingMachineService.getSelectedMachine();
  }

  onMachineSelected(machine: VendingMachine | null): void {
    this.selectedMachine = machine;
    this.vendingMachineService.selectMachine(machine);
  }

  navigateToMachineDetails(machineId: string): void {
    // Navigate to machine details if needed
    this.router.navigate(['/machine', machineId]);
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }
}
