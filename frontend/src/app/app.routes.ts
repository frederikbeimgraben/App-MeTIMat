import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './services/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./components/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./components/home/home.component').then((m) => m.HomeComponent),
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./components/orders/orders.component').then((m) => m.OrdersComponent),
      },
      {
        path: 'orders/:id',
        loadComponent: () =>
          import('./components/order-detail/order-detail.component').then(
            (m) => m.OrderDetailComponent,
          ),
      },
      {
        path: 'prescription',
        children: [
          {
            path: 'import',
            loadComponent: () =>
              import('./components/prescription-import/prescription-import.component').then(
                (m) => m.PrescriptionImportComponent,
              ),
          },
          {
            path: 'list',
            loadComponent: () =>
              import('./components/prescription-list/prescription-list.component').then(
                (m) => m.PrescriptionListComponent,
              ),
          },
          {
            path: 'scan',
            loadComponent: () =>
              import('./components/nfc-scanner/nfc-scanner.component').then(
                (m) => m.NfcScannerComponent,
              ),
          },
        ],
      },
      {
        path: 'prescriptions',
        loadComponent: () =>
          import('./components/prescription-list/prescription-list.component').then(
            (m) => m.PrescriptionListComponent,
          ),
      },
      {
        path: 'medication',
        children: [
          {
            path: 'search',
            loadComponent: () =>
              import('./components/medication-search/medication-search.component').then(
                (m) => m.MedicationSearchComponent,
              ),
          },
        ],
      },
      {
        path: 'cart',
        loadComponent: () =>
          import('./components/cart/cart.component').then((m) => m.CartComponent),
      },
      {
        path: 'map',
        loadComponent: () => import('./components/map/map.component').then((m) => m.MapComponent),
      },
      {
        path: 'locations',
        loadComponent: () =>
          import('./components/locations-view/locations-view.component').then(
            (m) => m.LocationsViewComponent,
          ),
      },
      {
        path: 'location',
        loadComponent: () =>
          import('./components/location-picker/location-picker.component').then(
            (m) => m.LocationPickerComponent,
          ),
      },
      {
        path: 'checkout',
        children: [
          {
            path: 'payment',
            loadComponent: () =>
              import('./components/payment/payment.component').then((m) => m.PaymentComponent),
          },
          {
            path: 'location',
            loadComponent: () =>
              import('./components/location-picker/location-picker.component').then(
                (m) => m.LocationPickerComponent,
              ),
          },
          {
            path: 'confirmation',
            loadComponent: () =>
              import('./components/order-confirmation/order-confirmation.component').then(
                (m) => m.OrderConfirmationComponent,
              ),
          },
        ],
      },
      {
        path: 'admin',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./components/admin/admin.component').then((m) => m.AdminComponent),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
