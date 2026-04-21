// app.config.ts — Sprint 4
// Se agrega authInterceptor al chain de interceptores HTTP.

import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';

import { routes } from './app.routes';
import { httpErrorInterceptor } from './core/interceptors/http-error.interceptor';
import { authInterceptor }      from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),

    // Orden de interceptores: auth primero (agrega el token),
    // luego error handler (loguea/transforma errores).
    provideHttpClient(
      withFetch(),
      withInterceptors([authInterceptor, httpErrorInterceptor])
    ),
  ],
};