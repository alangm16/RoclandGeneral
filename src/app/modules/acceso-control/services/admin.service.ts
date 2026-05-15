import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/Environment';
import {
  DashboardKpis,
  AccesoActivoResponse,
  FlujoPorHoraDto,
  AreaVisitadaDto,
  FlujoDiarioDto,
  PersonaPerfilDto,
  PersonasPaginadas,
  HistorialAccesoItemDto,
  HistorialPaginado,
  GuardiaResumen,
  GuardiasPaginados,
  GuardiaUpdateDto,
  CatalogoItem,
  CatalogoCreateDto,
  UsuarioSinPerfil,
  CrearPerfilRequest
} from '../models/admin.models';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/web/accesocontrol`;

  // ── Dashboard ──────────────────────────────────────────────────────
  getKpis(): Observable<DashboardKpis> {
    return this.http.get<DashboardKpis>(`${this.base}/admin/kpis`);
  }

  getActivosZona(): Observable<AccesoActivoResponse[]> {
    return this.http.get<AccesoActivoResponse[]>(`${this.base}/operaciones/activosZona`);
  }

  getFlujoHoras(): Observable<FlujoPorHoraDto[]> {
    return this.http.get<FlujoPorHoraDto[]>(`${this.base}/admin/flujo/horas`);
  }

  getAreasRanking(dias: number = 30): Observable<AreaVisitadaDto[]> {
    const params = new HttpParams().set('dias', dias.toString());
    return this.http.get<AreaVisitadaDto[]>(`${this.base}/admin/areas/ranking`, { params });
  }

  getFlujoDiario(anio: number, mes: number): Observable<FlujoDiarioDto[]> {
    const params = new HttpParams()
      .set('anio', anio.toString())
      .set('mes', mes.toString());
    return this.http.get<FlujoDiarioDto[]>(`${this.base}/admin/flujo/diario`, { params });
  }

  // ── Personas ───────────────────────────────────────────────────────
  getPersonas(page: number, pageSize: number, busqueda?: string): Observable<PersonasPaginadas> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    if (busqueda) params = params.set('busqueda', busqueda);
    return this.http.get<PersonasPaginadas>(`${this.base}/admin/personas`, { params });
  }

  getPerfilPersona(id: number): Observable<PersonaPerfilDto> {
    return this.http.get<PersonaPerfilDto>(`${this.base}/admin/personas/${id}`);
  }

  getHistorialPersona(id: number): Observable<HistorialAccesoItemDto[]> {
    return this.http.get<HistorialAccesoItemDto[]>(`${this.base}/admin/personas/${id}/historial`);
  }

  // ── Guardias ───────────────────────────────────────────────────────
  getGuardias(page: number, pageSize: number, busqueda?: string): Observable<GuardiasPaginados> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    if (busqueda) params = params.set('busqueda', busqueda);
    return this.http.get<GuardiasPaginados>(`${this.base}/admin/guardias`, { params });
  }

  actualizarGuardia(id: number, dto: GuardiaUpdateDto): Observable<void> {
    return this.http.put<void>(`${this.base}/admin/guardias/${id}`, dto);
  }

  // ── Historial ─────────────────────────────────────────────────────
  getHistorial(
    pagina: number,
    porPagina: number,
    filtros?: { busqueda?: string; tipo?: string; desde?: string; hasta?: string }
  ): Observable<HistorialPaginado> {
    let params = new HttpParams()
      .set('pagina', pagina.toString())
      .set('porPagina', porPagina.toString());
    if (filtros?.busqueda) params = params.set('busqueda', filtros.busqueda);
    if (filtros?.tipo) params = params.set('tipo', filtros.tipo);
    if (filtros?.desde) params = params.set('desde', filtros.desde);
    if (filtros?.hasta) params = params.set('hasta', filtros.hasta);
    return this.http.get<HistorialPaginado>(`${this.base}/admin/historial`, { params });
  }

  // ── Catálogos administrativos ────────────────────────────────────
  getCatalogo(tipo: 'areas' | 'motivos' | 'tiposid'): Observable<CatalogoItem[]> {
    return this.http.get<CatalogoItem[]>(`${this.base}/admin/${tipo}`);
  }

  crearCatalogo(tipo: 'areas' | 'motivos' | 'tiposid', dto: CatalogoCreateDto): Observable<CatalogoItem> {
    return this.http.post<CatalogoItem>(`${this.base}/admin/${tipo}`, dto);
  }

  toggleCatalogo(tipo: 'areas' | 'motivos' | 'tiposid', id: number): Observable<void> {
    return this.http.put<void>(`${this.base}/admin/${tipo}/${id}/toggle`, {});
  }

  exportarExcel(): Observable<Blob> {
    return this.http.get(`${this.base}/admin/exportar/excel`, { responseType: 'blob' });
  }

  exportarPdf(): Observable<Blob> {
    return this.http.get(`${this.base}/admin/exportar/pdf`, { responseType: 'blob' });
  }

  obtenerUsuariosSinPerfil(): Observable<UsuarioSinPerfil[]> {
    return this.http.get<UsuarioSinPerfil[]>(`${this.base}/admin/usuarios/sinperfil`);
  }

  crearPerfil(data: CrearPerfilRequest): Observable<void> {
    return this.http.post<void>(`${this.base}/admin/usuarios/crearperfil`, data);
  }

  cambiarEstadoGuardia(id: number, activo: boolean): Observable<void> {
    return this.http.put<void>(`${this.base}/admin/guardias/${id}/estado`, activo);
  }
}