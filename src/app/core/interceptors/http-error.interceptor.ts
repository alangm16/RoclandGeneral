// http-error.interceptor.tsd
import { AuthService } from '../auth/auth.service';
import { inject } from '@angular/core';
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
      

      if (err.status === 401) {
        const auth = inject(AuthService);
        auth.logout(); // limpia sesión y redirige
      }
      const ignorar = err.status === 404 || err.status === 0;
      if (!ignorar) {
        console.error(`[HTTP ${err.status}] ${req.method} ${req.url}`, err);
      }
      return throwError(() => err);
    })
  );
};