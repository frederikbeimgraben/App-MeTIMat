import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoModule } from '@ngneat/transloco';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, MatIconModule, TranslocoModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-md w-full space-y-8 text-center">
        <div>
          <div class="flex justify-center">
            <img class="h-16 w-auto" src="assets/logo/favicon.svg" alt="MeTIMat Logo" />
          </div>
          <h2 class="mt-6 text-3xl font-extrabold text-gray-900">Email Verification</h2>
        </div>

        @if (loading()) {
          <div class="flex flex-col items-center">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
            <p class="mt-4 text-gray-600">Verifying your email...</p>
          </div>
        } @else if (success()) {
          <div class="rounded-md bg-green-50 p-6 border border-green-200">
            <div class="flex flex-col items-center">
              <mat-icon class="text-green-500 text-5xl h-12 w-12 mb-4">check_circle</mat-icon>
              <h3 class="text-lg font-medium text-green-800">Email Verified!</h3>
              <p class="mt-2 text-sm text-green-700">
                Your email address has been successfully verified. You can now log in to your account.
              </p>
              <div class="mt-6">
                <a
                  routerLink="/login"
                  class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                >
                  Go to Login
                </a>
              </div>
            </div>
          </div>
        } @else {
          <div class="rounded-md bg-red-50 p-6 border border-red-200">
            <div class="flex flex-col items-center">
              <mat-icon class="text-red-500 text-5xl h-12 w-12 mb-4">error</mat-icon>
              <h3 class="text-lg font-medium text-red-800">Verification Failed</h3>
              <p class="mt-2 text-sm text-red-700">
                {{ error() || 'The verification link is invalid or has expired.' }}
              </p>
              <div class="mt-6">
                <a
                  routerLink="/register"
                  class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-teal-700 bg-teal-100 hover:bg-teal-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                >
                  Back to Registration
                </a>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class VerifyEmailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);

  loading = signal(true);
  success = signal(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.loading.set(false);
      this.error.set('No verification token provided.');
      return;
    }

    this.authService.verifyEmail(token).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(true);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.detail || 'Email verification failed.');
      },
    });
  }
}
