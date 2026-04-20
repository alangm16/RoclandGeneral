// http-error.interceptor.ts
// Rocland — Interceptor HTTP global
// Sprint 2: manejo de errores centralizado.
// Sprint 5: aquí se agregará la inyección del Bearer token JWT.

import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpErrorResponse,
} from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const httpErrorInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      // Log centralizado en desarrollo
      if (err.status !== 404) {
        // 404 es normal en el autocompletado — no lo logueamos
        console.error(`[HTTP ${err.status}] ${req.method} ${req.url}`, err);
      }

      // Re-lanzar para que cada servicio maneje según su contexto
      return throwError(() => err);
    })
  );
};

/*
 * ── Sprint 5: Auth interceptor (placeholder) ──────────────────────
 * Cuando implementemos el login, agregar aquí:
 *
 * import { inject } from '@angular/core';
 * import { AuthService } from '../modules/auth/services/auth.service';
 *
 * const token = inject(AuthService).getToken();
 * if (token) {
 *   req = req.clone({
 *     setHeaders: { Authorization: `Bearer ${token}` }
 *   });
 * }
 */