// acceso.service.ts (sin cambios funcionales, solo ajuste de base)
import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Observable, throwError, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/Environment';
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

@Injectable({ providedIn: 'root' })
export class AccesoService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly base = `${environment.apiUrl}/api/web/accesocontrol`;

  get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  getTiposIdentificacion(): Observable<TipoIdentificacion[]> {
    return this.http.get<TipoIdentificacion[]>(`${this.base}/catalogos/tipos-id`)
      .pipe(catchError(this.handleError));
  }

  getAreas(): Observable<Area[]> {
    return this.http.get<Area[]>(`${this.base}/catalogos/areas`)
      .pipe(catchError(this.handleError));
  }

  getMotivos(): Observable<MotivoVisita[]> {
    return this.http.get<MotivoVisita[]>(`${this.base}/catalogos/motivos`)
      .pipe(catchError(this.handleError));
  }

  buscarPersona(numId: string): Observable<PersonaAutocompletado | null> {
    const params = new HttpParams().set('numId', numId);
    return this.http.get<PersonaAutocompletado>(`${this.base}/personas/buscar`, { params })
      .pipe(
        catchError((err: HttpErrorResponse) => {
          if (err.status === 404) return of(null);
          return of(null);
        })
      );
  }

  registrarVisitante(payload: CrearVisitanteRequest): Observable<VisitanteResponse> {
    return this.http.post<VisitanteResponse>(`${this.base}/visitantes`, payload)
      .pipe(catchError(this.handleError));
  }

  registrarProveedor(payload: CrearProveedorRequest): Observable<ProveedorResponse> {
    return this.http.post<ProveedorResponse>(`${this.base}/proveedores`, payload)
      .pipe(catchError(this.handleError));
  }

  private handleError(err: HttpErrorResponse): Observable<never> {
    let mensaje = 'Error de conexión. Verifica tu red e intenta de nuevo.';
    if (err.status === 0) {
      mensaje = 'No se pudo conectar con el servidor.';
    } else if (err.status === 429) {
      mensaje = 'Demasiadas solicitudes. Espera unos minutos.';
    } else if (err.status >= 400 && err.status < 500) {
      mensaje = typeof err.error === 'string' && err.error.length > 0
        ? err.error
        : 'No se pudo procesar la solicitud.';
    } else if (err.status >= 500) {
      mensaje = 'Error interno del servidor.';
    }
    return throwError(() => new Error(mensaje));
  }
}