import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { MatIconModule } from '@angular/material/icon';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject, Subscription } from 'rxjs';
import { CartService } from './services/cart.service';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, TranslocoModule, MatIconModule],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class App implements OnInit, OnDestroy {
  currentRoute: string = 'home';
  cartItemCount: number = 0;

  // Use public for template access
  public authService = inject(AuthService);

  private destroy$ = new Subject<void>();
  private subscriptions = new Subscription();

  constructor(
    private router: Router,
    private transloco: TranslocoService,
    private cartService: CartService,
  ) {
    // Set default language
    this.transloco.setActiveLang('de');
  }

  ngOnInit(): void {
    // Track current route for navigation highlighting
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.destroy$),
      )
      .subscribe((event: NavigationEnd) => {
        const urlSegments = event.url.split('/').filter((segment) => segment);
        this.currentRoute = urlSegments[0] || 'home';
      });

    // Subscribe to cart updates
    const cartSub = this.cartService.cart$.subscribe((cart) => {
      this.cartItemCount = cart.itemCount;
    });
    this.subscriptions.add(cartSub);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.subscriptions.unsubscribe();
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  isActive(route: string): boolean {
    if (route === 'home') {
      // Home is active if no other main bottom nav item is active
      return !['orders', 'map', 'admin'].map((i) => this.currentRoute.startsWith(i)).some((i) => i);
    }

    return this.currentRoute.startsWith(route);
  }

  logout(): void {
    this.authService.logout();
  }

  changeLanguage(lang: string): void {
    this.transloco.setActiveLang(lang);
  }
}
