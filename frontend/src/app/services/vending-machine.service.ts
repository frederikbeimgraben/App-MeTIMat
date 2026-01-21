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

  getAllMachines(): Observable<VendingMachine[]> {
    return this.http.get<VendingMachine[]>('/api/locations').pipe(
      catchError((error) => {
        console.error('Error loading vending machines:', error);
        return of([]);
      }),
    );
  }

  getMachineById(id: string): Observable<VendingMachine | undefined> {
    return this.http.get<VendingMachine>(`/api/locations/${id}`).pipe(
      catchError((error) => {
        console.error(`Error loading vending machine ${id}:`, error);
        return of(undefined);
      }),
    );
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
