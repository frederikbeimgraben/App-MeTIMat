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
  price: number;
  category: string;
  prescription_required: boolean;
  is_active: boolean;
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

type AdminTab = 'users' | 'meds' | 'orders' | 'locations';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatIconModule, TranslocoModule],
  templateUrl: './admin.component.html',
})
export class AdminComponent implements OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  public authService = inject(AuthService);
  private router = inject(Router);

  activeTab = signal<AdminTab>('users');
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
    price: [0, [Validators.required, Validators.min(0)]],
    category: ['all'],
    prescription_required: [false],
    is_active: [true],
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
    this.medForm.reset({ is_active: true, category: 'all', prescription_required: false });
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
    this.medForm.patchValue({
      name: med.name,
      pzn: med.pzn,
      description: med.description,
      price: med.price,
      category: med.category || 'all',
      prescription_required: med.prescription_required,
      is_active: med.is_active,
    });
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
