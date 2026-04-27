// auth.interceptor.ts
// Rocland — Interceptor HTTP de Autenticación
// Sprint 4: inyecta el Bearer token en todas las peticiones a la API.
// Reemplaza el placeholder del http-error.interceptor.ts del Sprint 2.

import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../../environments/Environment';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const auth = inject(AuthService);

  // Solo inyectar token en peticiones dirigidas a NUESTRA API
  // Evitar enviar el token a CDNs, Google Fonts, etc.
  const esLlamadaPropia = req.url.startsWith(environment.apiUrl);

  const token = auth.getToken();

  if (token && esLlamadaPropia) {
    const reqConToken = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
    return next(reqConToken);
  }

  return next(req);
};