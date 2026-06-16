// guardia-relevo.service.ts
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/Environment';

import {
  ChecklistResumenDto,
  ChecklistDetalleDto,
  PuntoDto,
  IncidenciaDto,
  DashboardResumenDto,
  ChecklistsPorDiaDto,
  IncidenciasPorDiaDto,
  GuardarChecklistDto,
  GuardarChecklistResponseDto,
  AgregarFotoDto
} from '../models/guardia-relevo.models';

@Injectable({ providedIn: 'root' })
export class GuardiaRelevoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/web/guardia-relevo`;

  // ==================== CHECKLISTS (Rondines) ====================
  /**
   * Obtiene el historial de rondines con filtros opcionales.
   * @param idGuardia - Filtrar por guardia específico (opcional)
   * @param desde - Fecha inicio (formato ISO, solo la fecha)
   * @param hasta - Fecha fin (formato ISO, solo la fecha)
   */
  getHistorial(idGuardia?: number, desde?: string, hasta?: string): Observable<ChecklistResumenDto[]> {
    let params = new HttpParams();
    if (idGuardia) params = params.set('idGuardia', idGuardia);
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.http.get<ChecklistResumenDto[]>(`${this.base}/Checklists`, { params });
  }

  /**
   * Obtiene el detalle completo de un rondín por su ID.
   * @param id - Id del checklist
   */
  getDetalleChecklist(id: number): Observable<ChecklistDetalleDto> {
    return this.http.get<ChecklistDetalleDto>(`${this.base}/Checklists/${id}`);
  }

  /**
   * Obtiene el catálogo de puntos activos (para formularios).
   */
  getPuntosActivos(): Observable<PuntoDto[]> {
    return this.http.get<PuntoDto[]>(`${this.base}/Checklists/puntos`);
  }

  // ==================== INCIDENCIAS ====================
  /**
   * Lista las incidencias filtradas por estado.
   * @param resuelta - true: solo resueltas, false: solo abiertas, null: todas
   */
  getIncidencias(resuelta?: boolean | null): Observable<IncidenciaDto[]> {
    let params = new HttpParams();
    if (resuelta !== undefined && resuelta !== null) {
      params = params.set('resuelta', resuelta);
    }
    return this.http.get<IncidenciaDto[]>(`${this.base}/Incidencias`, { params });
  }

  /**
   * Marca una incidencia como resuelta.
   * @param id - Id de la incidencia
   */
  resolverIncidencia(id: number): Observable<void> {
    return this.http.post<void>(`${this.base}/Incidencias/${id}/resolver`, null);
  }

  // ==================== DASHBOARD ====================
  /**
   * Obtiene el resumen de estadísticas del dashboard.
   */
  getDashboardResumen(): Observable<DashboardResumenDto> {
    return this.http.get<DashboardResumenDto>(`${this.base}/Dashboard/resumen`);
  }

  /**
   * Obtiene la cantidad de checklists por día (últimos N días).
   * @param dias - Número de días a consultar (default 7)
   */
  getChecklistsPorDia(dias: number = 7): Observable<ChecklistsPorDiaDto[]> {
    let params = new HttpParams().set('dias', dias);
    return this.http.get<ChecklistsPorDiaDto[]>(`${this.base}/Dashboard/checklists-por-dia`, { params });
  }

  /**
   * Obtiene el resumen de incidencias por estado (abiertas / resueltas).
   */
  getIncidenciasPorEstado(): Observable<{ [key: string]: number }> {
    return this.http.get<{ [key: string]: number }>(`${this.base}/Dashboard/incidencias-por-estado`);
  }

  /**
   * Obtiene la evolución diaria de incidencias (creadas vs resueltas) en los últimos N días.
   * @param dias - Número de días a consultar (default 30)
   */
  getIncidenciasPorDia(dias: number = 30): Observable<IncidenciasPorDiaDto[]> {
    let params = new HttpParams().set('dias', dias);
    return this.http.get<IncidenciasPorDiaDto[]>(`${this.base}/Dashboard/incidencias-por-dia`, { params });
  }

  // ==================== MÓVIL (endpoints adicionales si se requieren) ====================
  /**
   * Guarda un nuevo rondín (usado por la app móvil).
   * Nota: este endpoint pertenece al área móvil (api/mob/...), no al área web.
   * Se incluye por si el frontend web también necesita enviar rondines.
   */
  guardarChecklist(dto: GuardarChecklistDto): Observable<GuardarChecklistResponseDto> {
    // Este endpoint está en el controlador móvil, ajusta la URL si es necesario
    return this.http.post<GuardarChecklistResponseDto>(`${environment.apiUrl}/api/mob/guardiarelevo/checklist`, dto);
  }

  /**
   * Agrega una foto a un checklist existente (app móvil).
   */
  agregarFoto(dto: AgregarFotoDto): Observable<{ idFoto: number; mensaje: string }> {
    return this.http.post<{ idFoto: number; mensaje: string }>(`${environment.apiUrl}/api/mob/guardiarelevo/fotos`, dto);
  }
}