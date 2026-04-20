// app.config.ts — Sprint 2
// Angular 21 — Configuración global de la aplicación

import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import {
  provideHttpClient,
  withInterceptors,
  withFetch,
} from '@angular/common/http';

import { routes } from './app.routes';
import { httpErrorInterceptor } from './core/interceptors/http-error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),

    // withFetch() es requerido para SSR con Angular 17+ (usa fetch API en lugar de XMLHttpRequest)
    // withInterceptors() usa el patrón funcional de Angular 15+ (no el de clases legacy)
    provideHttpClient(
      withFetch(),
      withInterceptors([httpErrorInterceptor])
    ),

    // Sprint 5: Aquí se agregará provideAuth() / AuthGuard
  ],
};