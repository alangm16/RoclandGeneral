// acceso.service.ts
// Rocland — Módulo Acceso Control
// Servicio HTTP central para todo el módulo público de acceso.
// Sprint 2 — Conexión API

import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../environmets/Environment';

import {
  TipoIdentificacion,
  Area,
  MotivoVisita,
  PersonaAutocompletado,
  CrearVisitanteRequest,
  VisitanteResponse,
  CrearProveedorRequest,
  ProveedorResponse,
} from '../models/acceso.models';

@Injectable({
  providedIn: 'root',
})
export class AccesoService {

  private readonly http       = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly base       = environment.apiUrl;

  // ── Guardia SSR ───────────────────────────────────────────────────
  // El proyecto tiene SSR activo. Las llamadas HTTP se pueden hacer en servidor,
  // pero el autocompletado (que depende de input del usuario) nunca debe
  // ejecutarse en SSR — se protege en el componente con isPlatformBrowser.
  get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  // ── Catálogos ─────────────────────────────────────────────────────

  getTiposIdentificacion(): Observable<TipoIdentificacion[]> {
    return this.http
      .get<TipoIdentificacion[]>(`/api/web/accesocontrol/catalogos/tipos-id`)
      .pipe(catchError(this.handleError));
  }

  getAreas(): Observable<Area[]> {
    return this.http
      .get<Area[]>(`/api/web/accesocontrol/catalogos/areas`)
      .pipe(catchError(this.handleError));
  }

  getMotivos(): Observable<MotivoVisita[]> {
    return this.http
      .get<MotivoVisita[]>(`/api/web/accesocontrol/catalogos/motivos`)
      .pipe(catchError(this.handleError));
  }

  // ── Autocompletado ────────────────────────────────────────────────
  // Equivale a: GET /api/personas/buscar?numId=xxx
  // El switchMap en el componente se encarga de cancelar peticiones anteriores.
  // Retorna null si no encuentra persona (404) en lugar de propagar el error,
  // porque "no encontrado" es un resultado válido, no un fallo.
  buscarPersona(numId: string): Observable<PersonaAutocompletado | null> {
    const params = new HttpParams().set('numId', numId);
    return this.http
      .get<PersonaAutocompletado>(`/api/web/accesocontrol/personas/buscar`, { params })
      .pipe(
        catchError((err: HttpErrorResponse) => {
          if (err.status === 404) {
            return of(null); // No encontrado → limpiar campos, sin error
          }
          return of(null);   // Cualquier otro error → silencioso en autocompletado
        })
      );
  }

  // ── Visitante ─────────────────────────────────────────────────────
  registrarVisitante(payload: CrearVisitanteRequest): Observable<VisitanteResponse> {
    return this.http
      .post<VisitanteResponse>(`/api/web/accesocontrol/visitantes`, payload)
      .pipe(catchError(this.handleError));
  }

  // ── Proveedor ─────────────────────────────────────────────────────
  // Listo para Sprint 3
  registrarProveedor(payload: CrearProveedorRequest): Observable<ProveedorResponse> {
    return this.http
      .post<ProveedorResponse>(`/api/web/accesocontrol/proveedores`, payload)
      .pipe(catchError(this.handleError));
  }

  // ── Manejo de errores ─────────────────────────────────────────────
  // Transforma HttpErrorResponse en un Error con mensaje legible.
  // Los componentes se suscriben a este error y lo muestran en el alert global.
  private handleError(err: HttpErrorResponse): Observable<never> {
    let mensaje = 'Error de conexión. Verifica tu red e intenta de nuevo.';

    if (err.status === 0) {
      // Error de red / CORS / servidor caído
      mensaje = 'No se pudo conectar con el servidor. Verifica tu conexión.';
    } else if (err.status === 429) {
      mensaje = 'Has enviado demasiadas solicitudes. Espera unos minutos e intenta de nuevo.';
    } else if (err.status >= 400 && err.status < 500) {
      // El servidor respondió con un mensaje de error legible (string plano)
      mensaje = typeof err.error === 'string' && err.error.length > 0
        ? err.error
        : 'No se pudo procesar la solicitud. Verifica los datos e intenta de nuevo.';
    } else if (err.status >= 500) {
      mensaje = 'Error interno del servidor. Intenta de nuevo más tarde.';
    }

    return throwError(() => new Error(mensaje));
  }
}