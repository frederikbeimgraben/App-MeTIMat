import { Component, Input } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoModule } from '@ngneat/transloco';

@Component({
  selector: 'app-header-common',
  standalone: true,
  imports: [CommonModule, MatIconModule, TranslocoModule],
  template: `
    <header class="bg-white shadow-sm border-b-2 border-gray-200 sticky top-0 z-10">
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
        <h1 class="text-xl font-bold text-gray-900 flex-1">
          @if (titleKey) {
            {{ titleKey | transloco }}
          } @else {
            {{ title }}
          }
        </h1>
        <div class="header-actions">
          <ng-content select="[headerActions]"></ng-content>
        </div>
      </div>
    </header>
  `,
  styles: [
    `
      :host {
        display: block;
        @apply w-full sticky top-0;
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

  constructor(private location: Location) {}

  goBack(): void {
    this.location.back();
  }
}
