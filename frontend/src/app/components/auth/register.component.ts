import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoModule } from '@ngneat/transloco';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatIconModule,
    TranslocoModule,
    RouterLink,
  ],
  template: `
    <div
      class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8"
    >
      <div class="max-w-md w-full space-y-8">
        <div>
          <div class="flex justify-center">
            <img class="h-16 w-auto" src="assets/logo/favicon.svg" alt="MeTIMat Logo" />
          </div>
          <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">Konto erstellen</h2>
          <p class="mt-2 text-center text-sm text-gray-600">
            Oder
            <a routerLink="/login" class="font-medium text-teal-600 hover:text-teal-500">
              melden Sie sich mit Ihrem bestehenden Konto an
            </a>
          </p>
        </div>

        @if (success()) {
          <div class="rounded-md bg-green-50 p-4 border border-green-200">
            <div class="flex">
              <div class="flex-shrink-0">
                <mat-icon class="text-green-400">check_circle</mat-icon>
              </div>
              <div class="ml-3">
                <h3 class="text-sm font-medium text-green-800">Registrierung erfolgreich</h3>
                <div class="mt-2 text-sm text-green-700">
                  <p>
                    Eine Bestätigungs-E-Mail wurde an
                    <strong>{{ registeredEmail() }}</strong> gesendet. Bitte prüfen Sie Ihren
                    Posteingang und klicken Sie auf den Link, um Ihr Konto zu aktivieren.
                  </p>
                </div>
                <div class="mt-4">
                  <a
                    routerLink="/login"
                    class="text-sm font-medium text-green-800 hover:text-green-900 underline"
                  >
                    Zum Login
                  </a>
                </div>
              </div>
            </div>
          </div>
        } @else {
          <form class="mt-8 space-y-6" [formGroup]="registerForm" (ngSubmit)="onSubmit()">
            <div class="rounded-md shadow-sm -space-y-px">
              <div>
                <label for="full-name" class="sr-only">Vollständiger Name</label>
                <input
                  id="full-name"
                  type="text"
                  formControlName="fullName"
                  required
                  class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-teal-500 focus:border-teal-500 focus:z-10 sm:text-sm"
                  placeholder="Vollständiger Name"
                />
              </div>
              <div>
                <label for="email-address" class="sr-only">E-Mail-Adresse</label>
                <input
                  id="email-address"
                  type="email"
                  formControlName="email"
                  required
                  class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-teal-500 focus:border-teal-500 focus:z-10 sm:text-sm"
                  placeholder="E-Mail-Adresse"
                />
              </div>
              <div>
                <label for="password" class="sr-only">Passwort</label>
                <input
                  id="password"
                  type="password"
                  formControlName="password"
                  required
                  class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-teal-500 focus:border-teal-500 focus:z-10 sm:text-sm"
                  placeholder="Passwort"
                />
              </div>
            </div>

            <div class="space-y-4">
              <div class="flex items-start">
                <div class="flex items-center h-5">
                  <input
                    id="acceptTerms"
                    type="checkbox"
                    formControlName="acceptTerms"
                    class="focus:ring-teal-500 h-4 w-4 text-teal-600 border-gray-300 rounded"
                  />
                </div>
                <div class="ml-3 text-sm">
                  <label for="acceptTerms" class="font-medium text-gray-700">
                    Ich akzeptiere die
                    <a
                      href="https://metimat.de/agbs"
                      target="_blank"
                      class="text-teal-600 hover:text-teal-500 underline"
                      >AGB</a
                    >
                  </label>
                </div>
              </div>

              <div class="flex items-start">
                <div class="flex items-center h-5">
                  <input
                    id="newsletter"
                    type="checkbox"
                    formControlName="newsletter"
                    class="focus:ring-teal-500 h-4 w-4 text-teal-600 border-gray-300 rounded"
                  />
                </div>
                <div class="ml-3 text-sm">
                  <label for="newsletter" class="font-medium text-gray-700">
                    Ich möchte den Newsletter abonnieren (optional)
                  </label>
                </div>
              </div>
            </div>

            @if (error()) {
              <div class="text-red-600 text-sm text-center">
                {{ error() }}
              </div>
            }

            <div>
              <button
                type="submit"
                [disabled]="loading() || registerForm.invalid"
                class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50"
              >
                <span class="absolute left-0 inset-y-0 flex items-center pl-3">
                  <mat-icon class="text-teal-400 group-hover:text-teal-300">person_add</mat-icon>
                </span>
                {{ loading() ? 'Konto wird erstellt...' : 'Registrieren' }}
              </button>
            </div>
          </form>
        }
      </div>
    </div>
  `,
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  registerForm = this.fb.group({
    fullName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    acceptTerms: [false, Validators.requiredTrue],
    newsletter: [false],
  });

  loading = signal(false);
  success = signal(false);
  registeredEmail = signal('');
  error = signal<string | null>(null);

  onSubmit(): void {
    if (this.registerForm.invalid) return;

    this.loading.set(true);
    this.error.set(null);

    const { email, password, fullName, acceptTerms, newsletter } = this.registerForm.value;

    this.authService.register(email!, password!, fullName!, acceptTerms!, newsletter!).subscribe({
      next: (user) => {
        this.loading.set(false);
        this.success.set(true);
        this.registeredEmail.set(user.email);
      },
      error: (err) => {
        console.error('Registration failed:', err);
        this.error.set(
          err.error?.detail || 'Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut.',
        );
        this.loading.set(false);
      },
    });
  }
}
