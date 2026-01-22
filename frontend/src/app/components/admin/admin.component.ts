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
    <div class="min-h-screen bg-gray-100 p-4 md:p-8 pb-24 md:pb-8">
      <header class="mb-8 flex justify-between items-center gap-4 max-w-6xl mx-auto">
        <div class="flex items-center gap-4 min-w-0">
          <button
            (click)="goBack()"
            class="h-10 w-10 flex items-center justify-center hover:bg-gray-200 rounded-full transition-colors shrink-0"
          >
            <mat-icon class="!m-0">arrow_back</mat-icon>
          </button>
          <div class="min-w-0">
            <h1 class="text-2xl md:text-3xl font-bold text-blue-900 leading-tight truncate">
              Admin Panel
            </h1>
            <p class="text-sm text-gray-600 truncate">Manage System Resources</p>
          </div>
        </div>
        <div class="flex items-center gap-2 flex-nowrap shrink-0">
          <button
            (click)="openCreateModal()"
            class="hidden sm:flex h-10 items-center gap-2 px-6 bg-blue-900 text-white rounded-full shadow-lg hover:bg-blue-800 transition-all hover:scale-105"
          >
            <mat-icon class="!m-0">add</mat-icon>
            <span class="font-bold">Create New</span>
          </button>
          <button
            (click)="loadData()"
            class="hidden sm:flex h-10 w-10 items-center justify-center bg-white rounded-xl shadow-sm hover:bg-gray-50 border border-gray-200 transition-colors"
            title="Reload Data"
          >
            <mat-icon class="!m-0">refresh</mat-icon>
          </button>
          <button
            (click)="logout()"
            class="h-10 flex items-center space-x-1 px-4 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Logout"
          >
            <mat-icon style="width: 20px; height: 20px; font-size: 20px">logout</mat-icon>
            <span class="text-sm font-medium hidden min-[400px]:inline">Abmelden</span>
          </button>
        </div>
      </header>

      <!-- Mobile FABs -->
      <div class="sm:hidden fixed bottom-6 right-6 flex flex-col gap-3 z-50 items-end">
        <button
          (click)="loadData()"
          class="w-14 h-14 bg-white text-blue-900 rounded-full shadow-lg flex items-center justify-center border border-gray-200 hover:scale-110 active:scale-95 transition-all"
          aria-label="Reload Data"
        >
          <mat-icon style="font-size: 28px; width: 28px; height: 28px">refresh</mat-icon>
        </button>
        <button
          (click)="openCreateModal()"
          class="w-14 h-14 bg-blue-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
          aria-label="Create New"
        >
          <mat-icon style="font-size: 32px; width: 32px; height: 32px">add</mat-icon>
        </button>
      </div>

      <div class="max-w-6xl mx-auto">
        <!-- Tabs -->
        <div
          class="bg-white p-1.5 rounded-xl shadow-sm border border-gray-200 mb-8 flex gap-1 max-w-3xl mx-auto overflow-x-auto"
        >
          <button
            (click)="activeTab.set('users')"
            [class]="
              activeTab() === 'users'
                ? 'bg-blue-900 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            "
            class="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 font-bold rounded-lg transition-all min-w-[120px]"
          >
            <mat-icon class="scale-90">people</mat-icon>
            <span>Users</span>
          </button>
          <button
            (click)="activeTab.set('medications')"
            [class]="
              activeTab() === 'medications'
                ? 'bg-blue-900 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            "
            class="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 font-bold rounded-lg transition-all min-w-[120px]"
          >
            <mat-icon class="scale-90">medication</mat-icon>
            <span>Meds</span>
          </button>
          <button
            (click)="activeTab.set('orders')"
            [class]="
              activeTab() === 'orders'
                ? 'bg-blue-900 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            "
            class="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 font-bold rounded-lg transition-all min-w-[120px]"
          >
            <mat-icon class="scale-90">shopping_cart</mat-icon>
            <span>Orders</span>
          </button>
          <button
            (click)="activeTab.set('locations')"
            [class]="
              activeTab() === 'locations'
                ? 'bg-blue-900 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            "
            class="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 font-bold rounded-lg transition-all min-w-[120px]"
          >
            <mat-icon class="scale-90">place</mat-icon>
            <span>Locations</span>
          </button>
        </div>

        <!-- Users Tab -->
        @if (activeTab() === 'users') {
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
            <table class="w-full text-left border-collapse min-w-[600px]">
              <thead
                class="bg-gray-50/50 border-b border-gray-100 text-[10px] uppercase text-gray-400 font-extrabold tracking-widest"
              >
                <tr>
                  <th class="px-6 py-4">Name</th>
                  <th class="px-6 py-4">Email</th>
                  <th class="px-6 py-4">Role</th>
                  <th class="px-6 py-4">Status</th>
                  <th class="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-50">
                @for (user of users(); track user.id) {
                  <tr class="hover:bg-gray-50/50 transition-colors">
                    <td class="px-6 py-4 font-medium text-gray-900">{{ user.full_name }}</td>
                    <td class="px-6 py-4 text-gray-600">{{ user.email }}</td>
                    <td class="px-6 py-4">
                      <span
                        class="px-3 py-1 rounded-full text-[10px] font-bold tracking-wide"
                        [class]="
                          user.is_superuser
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        "
                      >
                        {{ user.is_superuser ? 'ADMIN' : 'USER' }}
                      </span>
                    </td>
                    <td class="px-6 py-4">
                      <span
                        class="inline-flex items-center gap-1.5 text-xs font-semibold"
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
                    <td class="px-6 py-4 text-right">
                      <div class="flex justify-end gap-2">
                        <button
                          (click)="editUser(user)"
                          class="h-9 w-9 flex items-center justify-center text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <mat-icon class="!m-0">edit</mat-icon>
                        </button>
                        <button
                          (click)="deleteResource('users', user.id)"
                          class="h-9 w-9 flex items-center justify-center text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <mat-icon class="!m-0">delete</mat-icon>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        <!-- Medications Tab -->
        @if (activeTab() === 'medications') {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (med of medications(); track med.id) {
              <div
                class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col group"
              >
                <div class="flex justify-between items-start mb-4">
                  <div>
                    <h3
                      class="font-bold text-lg text-gray-900 group-hover:text-blue-900 transition-colors"
                    >
                      {{ med.name }}
                    </h3>
                    <p class="text-xs font-mono text-gray-400 mt-1 uppercase tracking-wider">
                      PZN: {{ med.pzn }}
                    </p>
                    <div class="flex gap-2 mt-2">
                      <span
                        class="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold uppercase"
                      >
                        {{ med.category || 'General' }}
                      </span>
                      <span
                        [class]="
                          med.prescription_required
                            ? 'bg-red-50 text-red-700'
                            : 'bg-green-50 text-green-700'
                        "
                        class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase"
                      >
                        {{ med.prescription_required ? 'RX' : 'OTC' }}
                      </span>
                    </div>
                  </div>
                  <div class="flex gap-1">
                    <button
                      (click)="editMedication(med)"
                      class="h-9 w-9 flex items-center justify-center text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <mat-icon class="!m-0">edit</mat-icon>
                    </button>
                    <button
                      (click)="deleteResource('medications', med.id)"
                      class="h-9 w-9 flex items-center justify-center text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <mat-icon class="!m-0">delete</mat-icon>
                    </button>
                  </div>
                </div>
                <p class="text-sm text-gray-600 line-clamp-2 flex-1 mb-4">{{ med.description }}</p>
                <div class="pt-4 border-t border-gray-50 flex justify-between items-center">
                  <span class="text-xs text-gray-400 font-bold uppercase tracking-tight"
                    >Price</span
                  >
                  <span class="text-lg font-black text-blue-900"
                    >€{{ med.price?.toFixed(2) || '0.00' }}</span
                  >
                </div>
              </div>
            }
          </div>
        }

        <!-- Orders Tab -->
        @if (activeTab() === 'orders') {
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
            <table class="w-full text-left border-collapse min-w-[700px]">
              <thead
                class="bg-gray-50/50 border-b border-gray-100 text-[10px] uppercase text-gray-400 font-extrabold tracking-widest"
              >
                <tr>
                  <th class="px-6 py-4">Order ID</th>
                  <th class="px-6 py-4">User ID</th>
                  <th class="px-6 py-4">Status</th>
                  <th class="px-6 py-4">Created</th>
                  <th class="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-50">
                @for (order of orders(); track order.id) {
                  <tr class="hover:bg-gray-50/50 transition-colors">
                    <td class="px-6 py-4 font-mono font-bold text-blue-900">#{{ order.id }}</td>
                    <td class="px-6 py-4 text-gray-600">{{ order.user_id }}</td>
                    <td class="px-6 py-4">
                      <select
                        [value]="order.status"
                        (change)="updateOrderStatus(order, $any($event.target).value)"
                        class="bg-gray-50 border-transparent text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 block w-full max-w-[180px] p-2.5 font-medium transition-all outline-none"
                      >
                        <option value="pending">Pending</option>
                        <option value="available for pickup">Available for Pickup</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-500">
                      {{ order.created_at | date: 'medium' }}
                    </td>
                    <td class="px-6 py-4 text-right">
                      <div class="flex justify-end">
                        <button
                          (click)="deleteResource('orders', order.id)"
                          class="h-9 w-9 flex items-center justify-center text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <mat-icon class="!m-0">delete</mat-icon>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        <!-- Locations Tab -->
        @if (activeTab() === 'locations') {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (loc of locations(); track loc.id) {
              <div
                class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group"
              >
                <div class="flex justify-between items-start mb-4">
                  <div class="flex items-center gap-3">
                    <div
                      class="p-3 rounded-xl bg-blue-50 text-blue-900 group-hover:bg-blue-900 group-hover:text-white transition-colors shadow-inner"
                    >
                      <mat-icon>{{
                        loc.location_type === 'pharmacy' ? 'local_pharmacy' : 'smart_toy'
                      }}</mat-icon>
                    </div>
                    <h3 class="font-bold text-lg text-gray-900 leading-tight">{{ loc.name }}</h3>
                  </div>
                  <div class="flex gap-1">
                    <button
                      (click)="editLocation(loc)"
                      class="h-9 w-9 flex items-center justify-center text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <mat-icon class="!m-0">edit</mat-icon>
                    </button>
                    <button
                      (click)="deleteResource('locations', loc.id)"
                      class="h-9 w-9 flex items-center justify-center text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <mat-icon class="!m-0">delete</mat-icon>
                    </button>
                  </div>
                </div>
                <div class="space-y-3 text-sm">
                  <p class="text-gray-600 flex items-start gap-2">
                    <mat-icon class="text-blue-900/40 scale-75 mt-0.5">place</mat-icon>
                    <span class="flex-1">{{ loc.address }}</span>
                  </p>
                  <p class="text-gray-600 flex items-center gap-2">
                    <mat-icon class="text-blue-900/40 scale-75">schedule</mat-icon>
                    <span>{{ loc.opening_hours || 'N/A' }}</span>
                  </p>
                  <div class="mt-6 p-3 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <p
                      class="text-[10px] text-gray-400 uppercase font-extrabold mb-1 tracking-widest"
                    >
                      Validation Key
                    </p>
                    <p class="font-mono text-xs select-all text-blue-900 font-bold">
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
            <div class="p-8 border-b border-gray-100 flex justify-between items-center bg-white">
              <div>
                <h2 class="text-2xl font-black text-gray-900 tracking-tight">
                  {{ editingId() ? 'Edit' : 'Create New' }} {{ activeTab() | titlecase }}
                </h2>
                <p class="text-sm text-gray-500 mt-1">Please fill in the information below</p>
              </div>
              <button
                (click)="cancelEdit()"
                class="h-10 w-10 flex items-center justify-center hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-900"
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
                  <div class="grid grid-cols-2 gap-4">
                    <div class="grid gap-2">
                      <label class="text-xs font-bold text-gray-500 uppercase"
                        >Medication Name</label
                      >
                      <input
                        type="text"
                        formControlName="name"
                        class="w-full p-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 outline-none"
                      />
                    </div>
                    <div class="grid gap-2">
                      <label class="text-xs font-bold text-gray-500 uppercase"
                        >PZN (8 digits)</label
                      >
                      <input
                        type="text"
                        formControlName="pzn"
                        class="w-full p-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 outline-none"
                        maxlength="8"
                      />
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-4">
                    <div class="grid gap-2">
                      <label class="text-xs font-bold text-gray-500 uppercase">Category</label>
                      <select
                        formControlName="category"
                        class="w-full p-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 outline-none"
                      >
                        <option value="all">General</option>
                        <option value="pain">Schmerzmittel</option>
                        <option value="antibiotics">Antibiotika</option>
                        <option value="allergy">Allergie</option>
                        <option value="vitamins">Vitamine</option>
                        <option value="cold">Erkältung</option>
                        <option value="stomach">Magen-Darm</option>
                      </select>
                    </div>
                    <div class="grid gap-2">
                      <label class="text-xs font-bold text-gray-500 uppercase">Price (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        formControlName="price"
                        class="w-full p-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 outline-none"
                      />
                    </div>
                  </div>

                  <div class="grid gap-2">
                    <label class="text-xs font-bold text-gray-500 uppercase">Description</label>
                    <textarea
                      formControlName="description"
                      rows="3"
                      class="w-full p-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 outline-none resize-none"
                    ></textarea>
                  </div>

                  <div class="flex items-center gap-3 py-2">
                    <input
                      type="checkbox"
                      id="prescription_required"
                      formControlName="prescription_required"
                      class="w-5 h-5 rounded border-gray-300 text-blue-900 focus:ring-blue-900"
                    />
                    <label for="prescription_required" class="font-medium text-gray-700"
                      >Prescription Required (RX)</label
                    >
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
    price: [0, [Validators.required, Validators.min(0)]],
    category: ['all'],
    prescription_required: [false],
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
    this.medForm.patchValue({
      ...med,
      category: med.category || 'all',
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
