import {
  Component,
  OnInit,
  AfterViewInit,
  Input,
  Output,
  EventEmitter,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import * as L from 'leaflet';
import { VendingMachine } from '../../models/vending-machine.model';
import { VendingMachineService } from '../../services/vending-machine.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-location-map',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './location-map.component.html',
  styleUrls: ['./location-map.component.css'],
})
export class LocationMapComponent implements OnInit, OnDestroy {
  @Input() mode: 'view' | 'select' = 'view';
  @Input() selectedMachineId?: string;
  @Output() machineSelected = new EventEmitter<VendingMachine>();

  map!: L.Map;
  machines: VendingMachine[] = [];
  filteredMachines: VendingMachine[] = [];
  selectedMachine: VendingMachine | null = null;
  markers: L.Marker[] = [];
  userLocation: { lat: number; lng: number } | null = null;

  loading = true;
  mapLoaded = false;
  locationError = false;

  private subscriptions: Subscription = new Subscription();

  constructor(private vendingMachineService: VendingMachineService) {}

  ngOnInit(): void {
    this.loadMachines();
    this.getUserLocation();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    if (this.map) {
      this.map.remove();
    }
  }

  private loadMachines(): void {
    this.loading = true;
    const sub = this.vendingMachineService.getAllMachines().subscribe({
      next: (machines) => {
        this.machines = machines.map((m) => {
          // Pre-format address for display
          m.location = this.formatAddress(m);
          return m;
        });

        // If we already have user location, calculate distances now
        if (this.userLocation) {
          this.calculateDistances();
        }

        this.applyFilters();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading vending machines:', error);
        this.loading = false;
      },
    });
    this.subscriptions.add(sub);
  }

  private getUserLocation(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };

          // Update distances locally
          this.calculateDistances();

          // Re-filter/sort
          this.applyFilters();
        },
        (error) => {
          console.error('Error getting location:', error);
          this.locationError = true;
        },
      );
    }
  }

  private calculateDistances(): void {
    if (!this.userLocation) return;

    this.machines.forEach((machine) => {
      if (machine.position?.latitude && machine.position?.longitude) {
        machine.distance = this.calculateDistance(
          this.userLocation!.lat,
          this.userLocation!.lng,
          machine.position.latitude,
          machine.position.longitude,
        );
      }
    });
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return Math.round(d * 10) / 10;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private formatAddress(machine: VendingMachine): string {
    if (!machine.address) return '';
    const line = machine.address.line ? machine.address.line.join(', ') : '';
    const city = machine.address.city || '';
    const zip = machine.address.postalCode || '';
    return `${line}, ${zip} ${city}`.trim().replace(/^, /, '').replace(/, $/, '');
  }

  applyFilters(): void {
    let filtered = [...this.machines];

    // Sort by distance if available
    filtered.sort((a, b) => {
      const distA = a.distance ?? 9999;
      const distB = b.distance ?? 9999;
      return distA - distB;
    });

    this.filteredMachines = filtered;
  }

  selectMachine(machine: VendingMachine): void {
    this.selectedMachine = machine;
    this.vendingMachineService.selectMachine(machine);
    this.machineSelected.emit(machine);
  }
}
