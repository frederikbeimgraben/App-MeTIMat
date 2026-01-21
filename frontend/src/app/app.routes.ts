import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/home/home.component').then((m) => m.HomeComponent),
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
    path: 'consultation',
    loadComponent: () =>
      import('./components/consultations/consultations.component').then(
        (m) => m.ConsultationsComponent,
      ),
  },
  {
    path: 'consultation/:id',
    loadComponent: () => import('./components/chat/chat.component').then((m) => m.ChatComponent),
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
    loadComponent: () => import('./components/cart/cart.component').then((m) => m.CartComponent),
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
    path: '**',
    redirectTo: '',
  },
];
