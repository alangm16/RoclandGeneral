// guardia-relevo.service.ts
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/Environment';
import { ApiResponse, PagedResult } from '../models/guardia-relevo.models';
import {
  // Turnos
  ConfigTurnoResponse,
  ConfigTurnoSummary,
  CrearConfigTurnoRequest,
  ActualizarConfigTurnoRequest,
  // Checklist
  ChecklistPuntoResponse,
  ChecklistPuntosPorCategoriaResponse,
  CrearChecklistPuntoRequest,
  ActualizarChecklistPuntoRequest,
  ReordenarChecklistPuntosRequest,
  ChecklistRespuestaResponse,
  DiscrepanciaRespuestaResponse,
  // Perfiles
  PerfilResponse,
  PerfilSummary,
  CrearPerfilRequest,
  ActualizarPerfilRequest,
  UsuarioSuperAdminAsignadoDto,
  // Asignaciones
  AsignacionBaseResponse,
  AsignacionBaseSummary,
  CrearAsignacionBaseRequest,
  ActualizarAsignacionBaseRequest,
  // Participantes
  ParticipanteResponse,
  AsignarParticipanteRequest,
  // Incidencias
  IncidenciaResponse,
  IncidenciaListResponse,
  FiltrarIncidenciasRequest,
  ResolverIncidenciaRequest,
  CrearIncidenciaRequest,
  ActualizarIncidenciaRequest,
  // Relevos
  RelevoDetalleResponse,
  RelevoListResponse,
  RelevoHoyResponse,
  FiltrarRelevosRequest,
  CrearRelevoRequest,
  ActualizarEstadoRelevoRequest,
  // Configuración App
  ConfiguracionAppResponse,
  UpdateConfiguracionAppRequest,
  InfoModoResponse,
  // Generación
  GeneracionDtos,
  // Móvil
  IniciarParticipanteRequest,
  CerrarParticipanteRequest,
  GuardarRespuestaRequest,
  GuardarRespuestasBatchRequest
} from '../models/guardia-relevo.models';

@Injectable({ providedIn: 'root' })
export class GuardiaRelevoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/guardia-relevo`;

  // ==================== CONFIGURACIÓN APP ====================
  getConfiguracionApp(): Observable<ConfiguracionAppResponse> {
    return this.http.get<ApiResponse<ConfiguracionAppResponse>>(`${this.base}/AppConfig`)
      .pipe(map(res => res.data!));
  }

  updateConfiguracionApp(request: UpdateConfiguracionAppRequest): Observable<ConfiguracionAppResponse> {
    return this.http.put<ApiResponse<ConfiguracionAppResponse>>(`${this.base}/AppConfig`, request)
      .pipe(map(res => res.data!));
  }

  getInfoModo(): Observable<InfoModoResponse> {
    return this.http.get<ApiResponse<InfoModoResponse>>(`${this.base}/AppConfig/info-modo`)
      .pipe(map(res => res.data!));
  }

  // ==================== TURNOS (ConfigTurno) ====================
  getConfigTurno(id: number): Observable<ConfigTurnoResponse> {
    return this.http.get<ConfigTurnoResponse>(`${this.base}/ConfigTurno/${id}`);
  }

  getConfigTurnosActivos(): Observable<ConfigTurnoSummary[]> {
    return this.http.get<ApiResponse<ConfigTurnoSummary[]>>(`${this.base}/ConfigTurno/activos`)
      .pipe(map(res => res.data ?? []));
  }

  crearConfigTurno(dto: CrearConfigTurnoRequest): Observable<ConfigTurnoResponse> {
    return this.http.post<ConfigTurnoResponse>(`${this.base}/ConfigTurno`, dto);
  }

  actualizarConfigTurno(id: number, dto: ActualizarConfigTurnoRequest): Observable<ConfigTurnoResponse> {
    return this.http.put<ConfigTurnoResponse>(`${this.base}/ConfigTurno/${id}`, dto);
  }

  desactivarConfigTurno(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/ConfigTurno/${id}`);
  }

  // ==================== CHECKLIST ====================
  getChecklistPunto(id: number): Observable<ChecklistPuntoResponse> {
    return this.http.get<ApiResponse<ChecklistPuntoResponse>>(`${this.base}/Checklist/puntos/${id}`)
      .pipe(map(res => res.data!));
  }

  getChecklistPuntosActivos(): Observable<ChecklistPuntoResponse[]> {
    return this.http.get<ApiResponse<ChecklistPuntoResponse[]>>(`${this.base}/Checklist/puntos/activos`)
      .pipe(map(res => res.data ?? []));
  }

  getChecklistAgrupado(): Observable<ChecklistPuntosPorCategoriaResponse[]> {
    return this.http.get<ApiResponse<ChecklistPuntosPorCategoriaResponse[]>>(`${this.base}/Checklist/puntos/agrupados`)
      .pipe(map(res => res.data ?? []));
  }

  crearChecklistPunto(dto: CrearChecklistPuntoRequest): Observable<ChecklistPuntoResponse> {
    return this.http.post<ApiResponse<ChecklistPuntoResponse>>(`${this.base}/Checklist/puntos`, dto)
      .pipe(map(res => res.data!));
  }

  actualizarChecklistPunto(id: number, dto: ActualizarChecklistPuntoRequest): Observable<ChecklistPuntoResponse> {
    return this.http.put<ApiResponse<ChecklistPuntoResponse>>(`${this.base}/Checklist/puntos/${id}`, dto)
      .pipe(map(res => res.data!));
  }

  reordenarChecklistPuntos(dto: ReordenarChecklistPuntosRequest): Observable<void> {
    return this.http.patch<void>(`${this.base}/Checklist/puntos/reordenar`, dto);
  }

  desactivarChecklistPunto(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/Checklist/puntos/${id}`);
  }

  // Respuestas y discrepancias (solo consulta)
  getRespuestasPorParticipante(participanteId: number): Observable<ChecklistRespuestaResponse[]> {
    return this.http.get<ApiResponse<ChecklistRespuestaResponse[]>>(`${this.base}/Checklist/respuestas/participante/${participanteId}`)
      .pipe(map(res => res.data ?? []));
  }

  getDiscrepanciasPorRelevo(relevoId: number): Observable<DiscrepanciaRespuestaResponse[]> {
    return this.http.get<ApiResponse<DiscrepanciaRespuestaResponse[]>>(`${this.base}/Checklist/discrepancias/relevo/${relevoId}`)
      .pipe(map(res => res.data ?? []));
  }

  // ==================== PERFILES ====================
  getPerfil(id: number): Observable<PerfilResponse> {
    return this.http.get<ApiResponse<PerfilResponse>>(`${this.base}/Perfil/${id}`)
      .pipe(map(res => res.data!));
  }

  getPerfilPorSuperAdminId(superAdminId: number): Observable<PerfilResponse> {
    return this.http.get<ApiResponse<PerfilResponse>>(`${this.base}/Perfil/usuario/${superAdminId}`)
      .pipe(map(res => res.data!));
  }

  getUsuariosAsignados(): Observable<UsuarioSuperAdminAsignadoDto[]> {
    return this.http.get<ApiResponse<UsuarioSuperAdminAsignadoDto[]>>(`${this.base}/Perfil/usuarios-asignados`)
      .pipe(map(res => res.data ?? []));
  }

  getPerfilesActivos(turno?: string): Observable<PerfilSummary[]> {
    let params = new HttpParams();
    if (turno) params = params.set('turno', turno);
    return this.http.get<ApiResponse<PerfilSummary[]>>(`${this.base}/Perfil/activos`, { params })
      .pipe(map(res => res.data ?? []));
  }

  crearPerfil(dto: CrearPerfilRequest): Observable<PerfilResponse> {
    return this.http.post<ApiResponse<PerfilResponse>>(`${this.base}/Perfil`, dto)
      .pipe(map(res => res.data!));
  }

  actualizarPerfil(id: number, dto: ActualizarPerfilRequest): Observable<PerfilResponse> {
    return this.http.put<ApiResponse<PerfilResponse>>(`${this.base}/Perfil/${id}`, dto)
      .pipe(map(res => res.data!));
  }

  desactivarPerfil(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/Perfil/${id}`);
  }

  // ==================== ASIGNACIONES BASE ====================
  getAsignacionBase(id: number): Observable<AsignacionBaseResponse> {
    return this.http.get<ApiResponse<AsignacionBaseResponse>>(`${this.base}/AsignacionBase/${id}`)
      .pipe(map(res => res.data!));
  }

  getAsignacionesVigentes(): Observable<AsignacionBaseSummary[]> {
    return this.http.get<ApiResponse<AsignacionBaseSummary[]>>(`${this.base}/AsignacionBase/vigentes`)
      .pipe(map(res => res.data ?? []));
  }

  getAsignacionesPorTurno(configTurnoId: number): Observable<AsignacionBaseResponse[]> {
    return this.http.get<ApiResponse<AsignacionBaseResponse[]>>(`${this.base}/AsignacionBase/turno/${configTurnoId}`)
      .pipe(map(res => res.data ?? []));
  }

  crearAsignacionBase(dto: CrearAsignacionBaseRequest): Observable<AsignacionBaseResponse> {
    return this.http.post<ApiResponse<AsignacionBaseResponse>>(`${this.base}/AsignacionBase`, dto)
      .pipe(map(res => res.data!));
  }

  actualizarAsignacionBase(id: number, dto: ActualizarAsignacionBaseRequest): Observable<AsignacionBaseResponse> {
    return this.http.put<ApiResponse<AsignacionBaseResponse>>(`${this.base}/AsignacionBase/${id}`, dto)
      .pipe(map(res => res.data!));
  }

  desactivarAsignacionBase(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/AsignacionBase/${id}`);
  }

  // ==================== RELEVOS ====================
  getRelevoDetalle(id: number): Observable<RelevoDetalleResponse> {
    return this.http.get<ApiResponse<RelevoDetalleResponse>>(`${this.base}/Relevo/${id}`)
      .pipe(map(res => res.data!));
  }

  getRelevoHoy(configTurnoId: number): Observable<RelevoHoyResponse | null> {
    return this.http.get<ApiResponse<RelevoHoyResponse>>(`${this.base}/Relevo/hoy?configTurnoId=${configTurnoId}`)
      .pipe(map(res => res.data ?? null));
  }

  getRelevosPaginados(filtro: FiltrarRelevosRequest): Observable<PagedResult<RelevoListResponse>> {
    let params = this.buildHttpParams(filtro);
    return this.http.get<ApiResponse<PagedResult<RelevoListResponse>>>(`${this.base}/Relevo/paged`, { params })
      .pipe(map(res => res.data!));
  }

  crearRelevo(dto: CrearRelevoRequest): Observable<RelevoDetalleResponse> {
    return this.http.post<ApiResponse<RelevoDetalleResponse>>(`${this.base}/Relevo`, dto)
      .pipe(map(res => res.data!));
  }

  actualizarEstadoRelevo(id: number, dto: ActualizarEstadoRelevoRequest): Observable<RelevoDetalleResponse> {
    return this.http.patch<ApiResponse<RelevoDetalleResponse>>(`${this.base}/Relevo/${id}/estado`, dto)
      .pipe(map(res => res.data!));
  }

  // Participantes anidados
  getParticipantesPorRelevo(relevoId: number): Observable<ParticipanteResponse[]> {
    return this.http.get<ApiResponse<ParticipanteResponse[]>>(`${this.base}/Relevo/${relevoId}/participantes`)
      .pipe(map(res => res.data ?? []));
  }

  asignarParticipante(relevoId: number, dto: AsignarParticipanteRequest): Observable<ParticipanteResponse> {
    return this.http.post<ApiResponse<ParticipanteResponse>>(`${this.base}/Relevo/${relevoId}/participantes`, dto)
      .pipe(map(res => res.data!));
  }

  // Operaciones de participante (útiles desde web)
  iniciarParticipante(participanteId: number, observaciones?: string): Observable<ParticipanteResponse> {
    const dto: IniciarParticipanteRequest = { observaciones };
    return this.http.put<ApiResponse<ParticipanteResponse>>(`${this.base}/Relevo/participantes/${participanteId}/iniciar`, dto)
      .pipe(map(res => res.data!));
  }

  cerrarParticipante(participanteId: number, dto: CerrarParticipanteRequest): Observable<ParticipanteResponse> {
    return this.http.put<ApiResponse<ParticipanteResponse>>(`${this.base}/Relevo/participantes/${participanteId}/cerrar`, dto)
      .pipe(map(res => res.data!));
  }

  // ==================== INCIDENCIAS ====================
  getIncidenciaDetalle(id: number): Observable<IncidenciaResponse> {
    return this.http.get<ApiResponse<IncidenciaResponse>>(`${this.base}/Incidencia/${id}`)
      .pipe(map(res => res.data!));
  }

  getIncidenciasPorRelevo(relevoId: number): Observable<IncidenciaResponse[]> {
    return this.http.get<ApiResponse<IncidenciaResponse[]>>(`${this.base}/Incidencia/relevo/${relevoId}`)
      .pipe(map(res => res.data ?? []));
  }

  getIncidenciasPaginadas(filtro: FiltrarIncidenciasRequest): Observable<PagedResult<IncidenciaListResponse>> {
    let params = this.buildHttpParams(filtro);
    return this.http.get<ApiResponse<PagedResult<IncidenciaListResponse>>>(`${this.base}/Incidencia/paged`, { params })
      .pipe(map(res => res.data!));
  }

  crearIncidencia(dto: CrearIncidenciaRequest): Observable<IncidenciaResponse> {
    return this.http.post<ApiResponse<IncidenciaResponse>>(`${this.base}/Incidencia`, dto)
      .pipe(map(res => res.data!));
  }

  actualizarIncidencia(id: number, dto: ActualizarIncidenciaRequest): Observable<IncidenciaResponse> {
    return this.http.put<ApiResponse<IncidenciaResponse>>(`${this.base}/Incidencia/${id}`, dto)
      .pipe(map(res => res.data!));
  }

  resolverIncidencia(id: number, dto: ResolverIncidenciaRequest): Observable<IncidenciaResponse> {
    return this.http.patch<ApiResponse<IncidenciaResponse>>(`${this.base}/Incidencia/${id}/resolver`, dto)
      .pipe(map(res => res.data!));
  }

  // ==================== GENERACIÓN AUTOMÁTICA ====================
  generarRelevosDia(fecha?: string): Observable<GeneracionDtos> {
    let params = new HttpParams();
    if (fecha) params = params.set('fecha', fecha);
    return this.http.post<ApiResponse<GeneracionDtos>>(`${this.base}/GeneracionRelevo/generar-dia`, null, { params })
      .pipe(map(res => res.data!));
  }

  // ==================== HELPER ====================
  private buildHttpParams(filtro: any): HttpParams {
    let params = new HttpParams();
    for (const key of Object.keys(filtro)) {
      const value = filtro[key];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return params;
  }
}