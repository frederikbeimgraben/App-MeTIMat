import { ApplicationConfig, provideZoneChangeDetection, isDevMode, LOCALE_ID } from '@angular/core';
import { provideServiceWorker } from '@angular/service-worker';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { APP_BASE_HREF } from '@angular/common';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideTransloco } from '@ngneat/transloco';

import { routes } from './app.routes';
import { TranslocoHttpLoader } from './transloco-loader';
import { AuthInterceptor } from './services/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    { provide: APP_BASE_HREF, useValue: '/app/' },
    { provide: LOCALE_ID, useValue: 'de-DE' },
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
    provideAnimations(),
    provideTransloco({
      config: {
        availableLangs: ['de', 'en'],
        defaultLang: 'de',
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: TranslocoHttpLoader,
    }),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
