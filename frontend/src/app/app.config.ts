import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './interceptors/auth.interceptor';

// import { LOCALE_ID } from '@angular/core';
// import localeSr from '@angular/common/locales/sr-Latn';
// import { registerLocaleData } from '@angular/common';

// registerLocaleData(localeSr);

// // U providerima dodaj:
// // providers: [{ provide: LOCALE_ID, useValue: 'sr-Latn' }]

export const appConfig: ApplicationConfig = {
  providers: [provideZoneChangeDetection({ eventCoalescing: true }),
  provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
  provideHttpClient(withInterceptors([authInterceptor]))]
};
