import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoModule } from '@ngneat/transloco';

interface User {
  id: number;
  email: string;
  full_name: string;
  is_superuser: boolean;
  is_active: boolean;
}

interface Medication {
  id: number;
  name: string;
  pzn: string;
  description: string;
}

interface Location {
  id: number;
  name: string;
  address: string;
  is_pharmacy: boolean;
  latitude: number;
  longitude: number;
  opening_hours?: string;
  location_type?: string;
  validation_key?: string;
}

interface Order {
  id: number;
  user_id: number;
  status: string;
  access_token: string;
  created_at: string;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatIconModule, TranslocoModule],
  template: `
    <div class="min-h-screen bg-gray-100 p-4 md:p-8">
      <header class="mb-6 flex justify-between items-center max-w-6xl mx-auto">
        <div class="flex items-center gap-4">
          <button (click)="goBack()" class="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div>
            <h1 class="text-3xl font-bold text-blue-900">Admin Control Panel</h1>
            <p class="text-sm text-gray-600">Manage System Resources</p>
          </div>
        </div>
        <div class="flex gap-2">
          <button
            (click)="openCreateModal()"
            class="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-lg shadow hover:bg-blue-800 transition-colors"
          >
            <mat-icon>add</mat-icon>
            <span>Create New</span>
          </button>
          <button
            (click)="loadData()"
            class="p-2 bg-white rounded-lg shadow hover:bg-gray-50 border transition-colors"
          >
            <mat-icon>refresh</mat-icon>
          </button>
          <button
            (click)="logout()"
            class="p-2 text-red-600 bg-white rounded-lg shadow hover:bg-red-50 border border-red-100 transition-colors"
            title="Logout"
          >
            <mat-icon>logout</mat-icon>
          </button>
        </div>
      </header>

      <div class="max-w-6xl mx-auto">
        <!-- Tabs -->
        <div class="flex border-b border-gray-300 mb-6 bg-white rounded-t-lg overflow-x-auto">
          <button
            (click)="activeTab.set('users')"
            [class.border-blue-900]="activeTab() === 'users'"
            [class.text-blue-900]="activeTab() === 'users'"
            class="flex-1 min-w-[120px] py-4 px-4 font-semibold border-b-2 border-transparent transition-all"
          >
            Users
          </button>
          <button
            (click)="activeTab.set('medications')"
            [class.border-blue-900]="activeTab() === 'medications'"
            [class.text-blue-900]="activeTab() === 'medications'"
            class="flex-1 min-w-[120px] py-4 px-4 font-semibold border-b-2 border-transparent transition-all"
          >
            Medications
          </button>
          <button
            (click)="activeTab.set('orders')"
            [class.border-blue-900]="activeTab() === 'orders'"
            [class.text-blue-900]="activeTab() === 'orders'"
            class="flex-1 min-w-[120px] py-4 px-4 font-semibold border-b-2 border-transparent transition-all"
          >
            Orders
          </button>
          <button
            (click)="activeTab.set('locations')"
            [class.border-blue-900]="activeTab() === 'locations'"
            [class.text-blue-900]="activeTab() === 'locations'"
            class="flex-1 min-w-[120px] py-4 px-4 font-semibold border-b-2 border-transparent transition-all"
          >
            Locations
          </button>
        </div>

        <!-- Users Tab -->
        @if (activeTab() === 'users') {
          <div class="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table class="w-full text-left">
              <thead class="bg-gray-50 border-b text-xs uppercase text-gray-500 font-bold">
                <tr>
                  <th class="p-4">Name</th>
                  <th class="p-4">Email</th>
                  <th class="p-4">Role</th>
                  <th class="p-4">Status</th>
                  <th class="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y">
                @for (user of users(); track user.id) {
                  <tr class="hover:bg-gray-50 transition-colors">
                    <td class="p-4 font-medium">{{ user.full_name }}</td>
                    <td class="p-4 text-gray-600">{{ user.email }}</td>
                    <td class="p-4">
                      <span
                        class="px-2 py-1 rounded-full text-xs font-bold"
                        [class]="
                          user.is_superuser
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        "
                      >
                        {{ user.is_superuser ? 'ADMIN' : 'USER' }}
                      </span>
                    </td>
                    <td class="p-4">
                      <span
                        class="inline-flex items-center gap-1 text-xs font-semibold"
                        [class.text-green-600]="user.is_active"
                        [class.text-red-600]="!user.is_active"
                      >
                        <span
                          class="w-2 h-2 rounded-full"
                          [class.bg-green-500]="user.is_active"
                          [class.bg-red-500]="!user.is_active"
                        ></span>
                        {{ user.is_active ? 'Active' : 'Inactive' }}
                      </span>
                    </td>
                    <td class="p-4 text-right">
                      <button
                        (click)="editUser(user)"
                        class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <mat-icon>edit</mat-icon>
                      </button>
                      <button
                        (click)="deleteResource('users', user.id)"
                        class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <mat-icon>delete</mat-icon>
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        <!-- Medications Tab -->
        @if (activeTab() === 'medications') {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (med of medications(); track med.id) {
              <div
                class="bg-white p-5 rounded-xl border shadow-sm hover:shadow-md transition-all flex flex-col"
              >
                <div class="flex justify-between items-start mb-4">
                  <div>
                    <h3 class="font-bold text-lg text-blue-900">{{ med.name }}</h3>
                    <p class="text-xs font-mono text-gray-500">PZN: {{ med.pzn }}</p>
                  </div>
                  <div class="flex gap-1">
                    <button
                      (click)="editMedication(med)"
                      class="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button
                      (click)="deleteResource('medications', med.id)"
                      class="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                </div>
                <p class="text-sm text-gray-600 line-clamp-3 flex-1 mb-4">{{ med.description }}</p>
              </div>
            }
          </div>
        }

        <!-- Orders Tab -->
        @if (activeTab() === 'orders') {
          <div class="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table class="w-full text-left">
              <thead class="bg-gray-50 border-b text-xs uppercase text-gray-500 font-bold">
                <tr>
                  <th class="p-4">Order ID</th>
                  <th class="p-4">User ID</th>
                  <th class="p-4">Status</th>
                  <th class="p-4">Created</th>
                  <th class="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y">
                @for (order of orders(); track order.id) {
                  <tr class="hover:bg-gray-50">
                    <td class="p-4 font-mono font-bold text-blue-900">#{{ order.id }}</td>
                    <td class="p-4 text-gray-600">{{ order.user_id }}</td>
                    <td class="p-4">
                      <select
                        [value]="order.status"
                        (change)="updateOrderStatus(order, $any($event.target).value)"
                        class="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full max-w-[150px] p-2"
                      >
                        <option value="pending">Pending</option>
                        <option value="available for pickup">Available for Pickup</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td class="p-4 text-sm text-gray-500">
                      {{ order.created_at | date: 'medium' }}
                    </td>
                    <td class="p-4 text-right">
                      <button
                        (click)="deleteResource('orders', order.id)"
                        class="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <mat-icon>delete</mat-icon>
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        <!-- Locations Tab -->
        @if (activeTab() === 'locations') {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (loc of locations(); track loc.id) {
              <div class="bg-white p-5 rounded-xl border shadow-sm hover:shadow-md transition-all">
                <div class="flex justify-between items-start mb-3">
                  <div class="flex items-center gap-2">
                    <div class="p-2 rounded-lg bg-blue-50 text-blue-700">
                      <mat-icon>{{
                        loc.location_type === 'pharmacy' ? 'local_pharmacy' : 'smart_toy'
                      }}</mat-icon>
                    </div>
                    <h3 class="font-bold text-blue-900">{{ loc.name }}</h3>
                  </div>
                  <div class="flex gap-1">
                    <button
                      (click)="editLocation(loc)"
                      class="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button
                      (click)="deleteResource('locations', loc.id)"
                      class="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                </div>
                <div class="space-y-2 text-sm">
                  <p class="text-gray-600 flex items-center gap-2">
                    <mat-icon class="text-gray-400 scale-75">place</mat-icon>
                    {{ loc.address }}
                  </p>
                  <p class="text-gray-600 flex items-center gap-2">
                    <mat-icon class="text-gray-400 scale-75">schedule</mat-icon>
                    {{ loc.opening_hours || 'N/A' }}
                  </p>
                  <div class="mt-4 p-2 bg-gray-50 rounded border border-dashed">
                    <p class="text-[10px] text-gray-400 uppercase font-bold mb-1">Validation Key</p>
                    <p class="font-mono text-xs select-all">
                      {{ loc.validation_key || 'No Key Set' }}
                    </p>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>

      <!-- Modal Overlay -->
      @if (showModal()) {
        <div
          class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
        >
          <div
            class="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200"
          >
            <div class="p-6 border-b flex justify-between items-center bg-gray-50">
              <h2 class="text-xl font-bold text-blue-900">
                {{ editingId() ? 'Edit' : 'Create New' }} {{ activeTab() | titlecase }}
              </h2>
              <button
                (click)="cancelEdit()"
                class="p-1 hover:bg-gray-200 rounded-full transition-colors"
              >
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <div class="p-6">
              <!-- Form Switcher -->
              @if (activeTab() === 'users') {
                <form [formGroup]="userForm" (ngSubmit)="saveUser()" class="space-y-4">
                  <div class="grid gap-2">
                    <label class="text-xs font-bold text-gray-500 uppercase">Email Address</label>
                    <input
                      type="email"
                      formControlName="email"
                      class="w-full p-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="user@example.com"
                    />
                  </div>
                  <div class="grid gap-2">
                    <label class="text-xs font-bold text-gray-500 uppercase">Full Name</label>
                    <input
                      type="text"
                      formControlName="full_name"
                      class="w-full p-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="John Doe"
                    />
                  </div>
                  <div class="grid gap-2">
                    <label class="text-xs font-bold text-gray-500 uppercase">Password</label>
                    <input
                      type="password"
                      formControlName="password"
                      class="w-full p-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      [placeholder]="editingId() ? 'Leave empty to keep current' : '••••••••'"
                    />
                  </div>
                  <div class="flex gap-6 pt-2">
                    <label class="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        formControlName="is_superuser"
                        class="w-5 h-5 rounded border-gray-300 text-blue-900 focus:ring-blue-900"
                      />
                      <span class="font-medium text-gray-700">Administrator</span>
                    </label>
                    <label class="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        formControlName="is_active"
                        class="w-5 h-5 rounded border-gray-300 text-blue-900 focus:ring-blue-900"
                      />
                      <span class="font-medium text-gray-700">Active</span>
                    </label>
                  </div>
                  <div class="flex gap-3 pt-4">
                    <button
                      type="button"
                      (click)="cancelEdit()"
                      class="flex-1 px-4 py-3 border rounded-xl font-bold hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      [disabled]="userForm.invalid"
                      class="flex-[2] px-4 py-3 bg-blue-900 text-white rounded-xl font-bold hover:bg-blue-800 disabled:opacity-50 transition-all shadow-lg shadow-blue-900/20"
                    >
                      {{ editingId() ? 'Update' : 'Create' }} User
                    </button>
                  </div>
                </form>
              }

              @if (activeTab() === 'medications') {
                <form [formGroup]="medForm" (ngSubmit)="saveMedication()" class="space-y-4">
                  <div class="grid gap-2">
                    <label class="text-xs font-bold text-gray-500 uppercase">Medication Name</label>
                    <input
                      type="text"
                      formControlName="name"
                      class="w-full p-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div class="grid gap-2">
                    <label class="text-xs font-bold text-gray-500 uppercase">PZN (8 digits)</label>
                    <input
                      type="text"
                      formControlName="pzn"
                      class="w-full p-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      maxlength="8"
                    />
                  </div>
                  <div class="grid gap-2">
                    <label class="text-xs font-bold text-gray-500 uppercase">Description</label>
                    <textarea
                      formControlName="description"
                      rows="4"
                      class="w-full p-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    ></textarea>
                  </div>
                  <div class="flex gap-3 pt-4">
                    <button
                      type="button"
                      (click)="cancelEdit()"
                      class="flex-1 px-4 py-3 border rounded-xl font-bold hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      [disabled]="medForm.invalid"
                      class="flex-[2] px-4 py-3 bg-blue-900 text-white rounded-xl font-bold hover:bg-blue-800 disabled:opacity-50 transition-all shadow-lg shadow-blue-900/20"
                    >
                      {{ editingId() ? 'Update' : 'Save' }} Medication
                    </button>
                  </div>
                </form>
              }

              @if (activeTab() === 'locations') {
                <form [formGroup]="locForm" (ngSubmit)="saveLocation()" class="space-y-4">
                  <div class="grid gap-2">
                    <label class="text-xs font-bold text-gray-500 uppercase">Name</label>
                    <input
                      type="text"
                      formControlName="name"
                      class="w-full p-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div class="grid gap-2">
                    <label class="text-xs font-bold text-gray-500 uppercase">Address</label>
                    <input
                      type="text"
                      formControlName="address"
                      class="w-full p-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div class="grid grid-cols-2 gap-4">
                    <div class="grid gap-2">
                      <label class="text-xs font-bold text-gray-500 uppercase">Type</label>
                      <select
                        formControlName="location_type"
                        class="w-full p-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="pharmacy">Apotheke</option>
                        <option value="vending_machine">MeTIMat Automat</option>
                      </select>
                    </div>
                    <div class="grid gap-2">
                      <label class="text-xs font-bold text-gray-500 uppercase">Opening Hours</label>
                      <input
                        type="text"
                        formControlName="opening_hours"
                        class="w-full p-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="e.g. 08:00 - 20:00"
                      />
                    </div>
                  </div>
                  <div class="grid gap-2">
                    <label class="text-xs font-bold text-gray-500 uppercase">Validation Key</label>
                    <input
                      type="text"
                      formControlName="validation_key"
                      class="w-full p-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Secret key for the station"
                    />
                  </div>
                  <div class="grid grid-cols-2 gap-4">
                    <div class="grid gap-2">
                      <label class="text-xs font-bold text-gray-500 uppercase">Latitude</label>
                      <input
                        type="number"
                        step="any"
                        formControlName="latitude"
                        class="w-full p-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div class="grid gap-2">
                      <label class="text-xs font-bold text-gray-500 uppercase">Longitude</label>
                      <input
                        type="number"
                        step="any"
                        formControlName="longitude"
                        class="w-full p-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                  <div class="flex gap-3 pt-4">
                    <button
                      type="button"
                      (click)="cancelEdit()"
                      class="flex-1 px-4 py-3 border rounded-xl font-bold hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      [disabled]="locForm.invalid"
                      class="flex-[2] px-4 py-3 bg-blue-900 text-white rounded-xl font-bold hover:bg-blue-800 disabled:opacity-50 transition-all shadow-lg shadow-blue-900/20"
                    >
                      {{ editingId() ? 'Update' : 'Save' }} Location
                    </button>
                  </div>
                </form>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class AdminComponent implements OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  public authService = inject(AuthService);
  private router = inject(Router);

  activeTab = signal('users');
  users = signal<User[]>([]);
  medications = signal<Medication[]>([]);
  locations = signal<Location[]>([]);
  orders = signal<Order[]>([]);
  editingId = signal<number | null>(null);
  showModal = signal<boolean>(false);

  userForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    full_name: [''],
    password: [''],
    is_superuser: [false],
    is_active: [true],
  });

  medForm = this.fb.group({
    name: ['', Validators.required],
    pzn: ['', [Validators.required, Validators.pattern(/^[0-9]{8}$/)]],
    description: [''],
  });

  locForm = this.fb.group({
    name: ['', Validators.required],
    address: ['', Validators.required],
    latitude: [52.52, Validators.required],
    longitude: [13.405, Validators.required],
    opening_hours: [''],
    location_type: ['vending_machine', Validators.required],
    validation_key: [''],
    is_pharmacy: [false],
  });

  constructor() {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.http.get<User[]>('/api/v1/users/').subscribe((data) => this.users.set(data));
    this.http
      .get<Medication[]>('/api/v1/medications/')
      .subscribe((data) => this.medications.set(data));
    this.http.get<Location[]>('/api/v1/locations/').subscribe((data) => this.locations.set(data));
    this.http.get<Order[]>('/api/v1/orders/').subscribe((data) => this.orders.set(data));
  }

  openCreateModal(): void {
    this.editingId.set(null);
    this.showModal.set(true);
    this.resetForms();
  }

  deleteResource(type: string, id: number): void {
    if (!confirm('Are you sure you want to delete this resource?')) return;
    this.http.delete(`/api/v1/${type}/${id}`).subscribe(() => {
      this.loadData();
    });
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.showModal.set(false);
    this.resetForms();
  }

  private resetForms(): void {
    this.userForm.reset({ is_superuser: false, is_active: true });
    this.medForm.reset();
    this.locForm.reset({
      latitude: 52.52,
      longitude: 13.405,
      is_pharmacy: false,
      location_type: 'vending_machine',
    });
  }

  editUser(user: User): void {
    this.editingId.set(user.id);
    this.userForm.patchValue({
      email: user.email,
      full_name: user.full_name,
      is_superuser: user.is_superuser,
      is_active: user.is_active,
      password: '',
    });
    this.showModal.set(true);
  }

  saveUser(): void {
    if (this.userForm.invalid) return;
    const id = this.editingId();
    if (id) {
      this.http.put<User>(`/api/v1/users/${id}`, this.userForm.value).subscribe(() => {
        this.loadData();
        this.cancelEdit();
      });
    } else {
      this.http.post<User>('/api/v1/users/', this.userForm.value).subscribe(() => {
        this.loadData();
        this.cancelEdit();
      });
    }
  }

  editMedication(med: Medication): void {
    this.editingId.set(med.id);
    this.medForm.patchValue(med);
    this.showModal.set(true);
  }

  saveMedication(): void {
    if (this.medForm.invalid) return;
    const id = this.editingId();
    if (id) {
      this.http.put<Medication>(`/api/v1/medications/${id}`, this.medForm.value).subscribe(() => {
        this.loadData();
        this.cancelEdit();
      });
    } else {
      this.http.post<Medication>('/api/v1/medications/', this.medForm.value).subscribe(() => {
        this.loadData();
        this.cancelEdit();
      });
    }
  }

  editLocation(loc: Location): void {
    this.editingId.set(loc.id);
    this.locForm.patchValue(loc);
    this.showModal.set(true);
  }

  saveLocation(): void {
    if (this.locForm.invalid) return;
    const id = this.editingId();
    const data = { ...this.locForm.value };
    // Synchronize is_pharmacy based on location_type for compatibility
    data.is_pharmacy = data.location_type === 'pharmacy';

    if (id) {
      this.http.put<Location>(`/api/v1/locations/${id}`, data).subscribe(() => {
        this.loadData();
        this.cancelEdit();
      });
    } else {
      this.http.post<Location>('/api/v1/locations/', data).subscribe(() => {
        this.loadData();
        this.cancelEdit();
      });
    }
  }

  // Order Actions
  updateOrderStatus(order: Order, status: string): void {
    this.http.patch<Order>(`/api/v1/orders/${order.id}`, { status }).subscribe(() => {
      this.loadData();
    });
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  logout(): void {
    this.authService.logout();
  }
}
