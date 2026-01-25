import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoModule } from '@ngneat/transloco';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header-common',
  standalone: true,
  imports: [CommonModule, MatIconModule, TranslocoModule],
  template: `
    <header class="bg-white shadow-sm border-b-2 border-gray-200 sticky top-0 z-[50]">
      <div class="max-w-md mx-auto px-4 h-16 flex items-center">
        @if (hasBackButton) {
          <button
            id="backButton"
            (click)="goBack()"
            class="icon-btn mr-4"
            [attr.aria-label]="'common.back' | transloco"
          >
            <mat-icon class="text-gray-700" style="width: 24px; height: 24px; font-size: 24px">
              arrow_back
            </mat-icon>
          </button>
        }
        <h1 class="text-xl font-bold text-gray-900 flex-1 truncate mr-2">
          @if (titleKey) {
            {{ titleKey | transloco }}
          } @else {
            {{ title }}
          }
        </h1>
        <div class="flex items-center space-x-1">
          <div class="header-actions">
            <ng-content select="[headerActions]"></ng-content>
          </div>

          @if (authService.isAdmin()) {
            <button
              (click)="goToScannerDemo()"
              class="h-10 w-10 flex items-center justify-center text-blue-900 hover:bg-gray-100 rounded-full transition-colors"
              title="Scanner Demo"
              aria-label="Scanner Demo"
            >
              <mat-icon style="width: 24px; height: 24px; font-size: 24px"
                >qr_code_scanner</mat-icon
              >
            </button>
            <button
              (click)="goToAdmin()"
              class="h-10 w-10 flex items-center justify-center text-blue-900 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Admin"
            >
              <mat-icon style="width: 24px; height: 24px; font-size: 24px"
                >admin_panel_settings</mat-icon
              >
            </button>
          }

          <button
            (click)="logout()"
            class="h-10 flex items-center space-x-1 px-4 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Logout"
          >
            <mat-icon style="width: 20px; height: 20px; font-size: 20px">logout</mat-icon>
            <span class="text-sm font-medium">Abmelden</span>
          </button>
        </div>
      </div>
    </header>
  `,
  styles: [
    `
      :host {
        display: block;
        @apply w-full sticky top-0 z-[50];
      }

      .header-actions:empty {
        display: none;
      }
    `,
  ],
})
export class HeaderCommonComponent {
  @Input() title: string = '';
  @Input() titleKey: string = '';
  @Input() hasBackButton: boolean = true;
  @Output() backClick = new EventEmitter<void>();

  public authService = inject(AuthService);
  private location = inject(Location);
  public router = inject(Router);

  goBack(): void {
    if (this.backClick.observed) {
      this.backClick.emit();
    } else {
      this.location.back();
    }
  }

  logout(): void {
    this.authService.logout();
  }

  goToAdmin(): void {
    this.router.navigate(['/admin']);
  }

  goToScannerDemo(): void {
    this.router.navigate(['/scanner-demo']);
  }
}
