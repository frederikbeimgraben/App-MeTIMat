import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoModule } from '@ngneat/transloco';

@Component({
  selector: 'app-login',
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
          <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">MeTIMat Login</h2>
        </div>
        <form class="mt-8 space-y-6" [formGroup]="loginForm" (ngSubmit)="onSubmit()">
          <div class="rounded-md shadow-sm -space-y-px">
            <div>
              <label for="email-address" class="sr-only">Email address</label>
              <input
                id="email-address"
                name="email"
                type="email"
                formControlName="email"
                required
                class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-teal-500 focus:border-teal-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
              />
            </div>
            <div>
              <label for="password" class="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                formControlName="password"
                required
                class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-teal-500 focus:border-teal-500 focus:z-10 sm:text-sm"
                placeholder="Password"
              />
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
              [disabled]="loading() || loginForm.invalid"
              class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50"
            >
              <span class="absolute left-0 inset-y-0 flex items-center pl-3">
                <mat-icon class="text-teal-400 group-hover:text-teal-300">lock</mat-icon>
              </span>
              {{ loading() ? 'Logging in...' : 'Sign in' }}
            </button>
          </div>

          <div class="flex items-center justify-center space-y-2 flex-col">
            <div class="text-sm text-gray-600">Don't have an account yet?</div>
            <a
              routerLink="/register"
              class="w-full flex justify-center py-2 px-4 border border-teal-600 text-sm font-medium rounded-md text-teal-600 bg-white hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
            >
              Create new account
            </a>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  loading = signal(false);
  error = signal<string | null>(null);

  constructor() {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/']);
    }
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.loading.set(true);
    this.error.set(null);

    const { email, password } = this.loginForm.value;
    console.log('Attempting login for:', email);

    this.authService.login(email!, password!).subscribe({
      next: (user) => {
        console.log('Login successful for user:', user.email);
        let returnUrl = this.route.snapshot.queryParams['returnUrl'];

        if (Array.isArray(returnUrl)) returnUrl = returnUrl[0];
        const targetUrl = typeof returnUrl === 'string' && returnUrl ? returnUrl : '/';

        console.log('Redirecting to:', targetUrl);

        // Small delay ensures the AuthService signals have fully propagated before navigation
        setTimeout(() => {
          this.router.navigateByUrl(targetUrl).then(
            (navigated) => {
              if (!navigated) {
                console.warn('SPA navigation failed, forcing reload to home');
                window.location.href = '/app/';
              }
            },
            (err) => {
              console.error('Navigation error, forcing reload:', err);
              window.location.href = '/app/';
            },
          );
        }, 100);
      },
      error: (err) => {
        console.error('Login failed:', err);
        this.error.set('Invalid credentials. Please try again.');
        this.loading.set(false);
      },
    });
  }
}
