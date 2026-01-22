import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  VendingMachine,
  VendingMachineFilter,
  MedicationAvailability,
} from '../models/vending-machine.model';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class VendingMachineService {
  private selectedMachineSubject = new BehaviorSubject<VendingMachine | null>(null);
  public selectedMachine$ = this.selectedMachineSubject.asObservable();

  constructor(private http: HttpClient) {}

  getAllMachines(medicationIds?: number[]): Observable<VendingMachine[]> {
    let url = '/api/v1/locations/';
    if (medicationIds && medicationIds.length > 0) {
      url += `?medication_ids=${medicationIds.join(',')}`;
    }
    return this.http.get<any[]>(url).pipe(
      map((items) => items.map((item) => this.mapBackendToVendingMachine(item))),
      catchError((error) => {
        console.error('Error loading vending machines:', error);
        return of([]);
      }),
    );
  }

  getMachineById(id: string): Observable<VendingMachine | undefined> {
    return this.http.get<any>(`/api/v1/locations/${id}/`).pipe(
      map((item) => this.mapBackendToVendingMachine(item)),
      catchError((error) => {
        console.error(`Error loading vending machine ${id}:`, error);
        return of(undefined);
      }),
    );
  }

  private mapBackendToVendingMachine(data: any): VendingMachine {
    // Parse address string "Street 1, 12345 City"
    const addressStr = data.address || '';
    const parts = addressStr.split(',');
    let line: string[] = [];
    let postalCode = '';
    let city = '';

    if (parts.length > 0) {
      line.push(parts[0].trim());
    }

    if (parts.length > 1) {
      const cityPart = parts[1].trim();
      const match = cityPart.match(/^(\d{5})\s+(.+)$/);
      if (match) {
        postalCode = match[1];
        city = match[2];
      } else {
        city = cityPart;
      }
    }

    return {
      resourceType: 'Location',
      id: data.id ? data.id.toString() : undefined,
      status: 'active',
      name: data.name,
      description: data.opening_hours
        ? `Öffnungszeiten: ${data.opening_hours}`
        : 'Keine Öffnungszeiten verfügbar',
      address: {
        text: data.address,
        line: line,
        city: city,
        postalCode: postalCode,
        country: 'DE',
      },
      position: {
        latitude: data.latitude,
        longitude: data.longitude,
      },
      // Extended properties
      location: data.address,
      is_available: data.is_available,
    } as VendingMachine;
  }

  getActiveMachines(): Observable<VendingMachine[]> {
    return this.getAllMachines().pipe(
      map((machines) => machines.filter((m) => m.status === 'active')),
    );
  }

  filterMachines(filter: VendingMachineFilter): Observable<VendingMachine[]> {
    return this.getAllMachines().pipe(
      map((machines) => {
        return machines.filter((m) => {
          if (filter.status && m.status !== filter.status) {
            return false;
          }
          // Distance filtering requires user location, skipping for now
          return true;
        });
      }),
    );
  }

  getNearbyMachines(maxDistance: number = 5): Observable<VendingMachine[]> {
    // Ideally this should use user's geolocation and filter or ask backend
    // For now, returning all machines
    return this.getAllMachines();
  }

  selectMachine(machine: VendingMachine | null): void {
    this.selectedMachineSubject.next(machine);
  }

  getSelectedMachine(): VendingMachine | null {
    return this.selectedMachineSubject.value;
  }

  // Check medication availability in a specific machine
  checkMedicationAvailability(
    machineId: string,
    medicationIds: string[],
  ): Observable<MedicationAvailability[]> {
    // Placeholder for backend inventory check
    // Optimistically returning available to allow checkout flow
    return of(
      medicationIds.map((medId) => ({
        medicationId: medId,
        machineId: machineId,
        available: true,
        quantity: 10,
        lastChecked: new Date(),
      })),
    );
  }

  // Check which machines have specific medications
  findMachinesWithMedications(medicationIds: string[]): Observable<Map<string, VendingMachine[]>> {
    // Placeholder
    return of(new Map<string, VendingMachine[]>());
  }

  // Check overall availability for cart items
  checkCartAvailability(
    machineId: string,
    medicationIds: string[],
  ): Observable<{
    allAvailable: boolean;
    availableItems: string[];
    unavailableItems: string[];
  }> {
    // Optimistic availability check
    return of({
      allAvailable: true,
      availableItems: medicationIds,
      unavailableItems: [],
    });
  }
}
