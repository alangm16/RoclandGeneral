// super-admin.service.ts
// Rocland — Super Admin Service
// Cubre: Dashboard KPIs, Logs, Usuarios, Roles, Proyectos, Permisos

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/Environment';

import {
  SuperAdminDashboardKpis,
  AccesoLog,
  AccesoLogPaginado,
  AccesosDiaSemana,
  ModuloUsage,
  AlertaSA,
  UsuarioSA,
  UsuariosPaginados,
  CrearUsuarioSARequest,
  ActualizarUsuarioSARequest,
  RolSA,
  ProyectoDetalle,
  VistaDetalle,
  MatrizPermisos,
  AsignarPermisoRequest,
} from '../models/superadmin.models';

@Injectable({ providedIn: 'root' })
export class SuperAdminService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/superadmin`;

  // ── Dashboard ────────────────────────────────────────────────────

  getKpis(): Observable<SuperAdminDashboardKpis> {
    return this.http.get<SuperAdminDashboardKpis>(`${this.base}/dashboard/kpis`);
  }

  getAccesosSemana(): Observable<AccesosDiaSemana[]> {
    return this.http.get<AccesosDiaSemana[]>(`${this.base}/dashboard/accesos-semana`);
  }

  getModulosUsage(): Observable<ModuloUsage[]> {
    return this.http.get<ModuloUsage[]>(`${this.base}/dashboard/modulos-uso`);
  }

  getAlertas(): Observable<AlertaSA[]> {
    return this.http.get<AlertaSA[]>(`${this.base}/dashboard/alertas`);
  }

  // ── Logs de acceso ───────────────────────────────────────────────

  getLogsAcceso(
    pagina: number,
    porPagina: number,
    filtros?: { plataforma?: string; exitoso?: boolean }
  ): Observable<AccesoLogPaginado> {
    let params = new HttpParams()
      .set('pagina', pagina)
      .set('porPagina', porPagina);

    if (filtros?.plataforma) params = params.set('plataforma', filtros.plataforma);
    if (filtros?.exitoso !== undefined) params = params.set('exitoso', filtros.exitoso);

    return this.http.get<AccesoLogPaginado>(`${this.base}/dashboard/logs`, { params });
  }

  // ── Usuarios ─────────────────────────────────────────────────────

  getUsuarios(pagina: number, porPagina: number, busqueda?: string): Observable<UsuariosPaginados> {
    let params = new HttpParams()
      .set('pagina', pagina)
      .set('porPagina', porPagina);
    if (busqueda) params = params.set('busqueda', busqueda);
    return this.http.get<UsuariosPaginados>(`${this.base}/usuarios`, { params });
  }

  getUsuarioPorId(id: number): Observable<UsuarioSA> {
    return this.http.get<UsuarioSA>(`${this.base}/usuarios/${id}`);
  }

  crearUsuario(dto: CrearUsuarioSARequest): Observable<UsuarioSA> {
    return this.http.post<UsuarioSA>(`${this.base}/usuarios`, dto);
  }

  actualizarUsuario(id: number, dto: ActualizarUsuarioSARequest): Observable<void> {
    return this.http.put<void>(`${this.base}/usuarios/${id}`, dto);
  }

  desactivarUsuario(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/usuarios/${id}`);
  }

  resetPassword(id: number, nuevaPassword: string): Observable<void> {
    return this.http.post<void>(`${this.base}/usuarios/${id}/reset-password`, { nuevaPassword });
  }

  // ── Roles ─────────────────────────────────────────────────────────

  getRoles(): Observable<RolSA[]> {
    return this.http.get<RolSA[]>(`${this.base}/roles`);
  }

  crearRol(nombre: string): Observable<RolSA> {
    return this.http.post<RolSA>(`${this.base}/roles`, { nombre });
  }

  // ── Proyectos y Vistas ────────────────────────────────────────────

  getProyectos(): Observable<ProyectoDetalle[]> {
    return this.http.get<ProyectoDetalle[]>(`${this.base}/proyectos`);
  }

  crearProyecto(dto: {
    codigo: string; nombre: string; plataforma: string;
    urlBase?: string; iconoCss?: string; orden?: number;
  }): Observable<ProyectoDetalle> {
    return this.http.post<ProyectoDetalle>(`${this.base}/proyectos`, dto);
  }

  crearVista(proyectoId: number, dto: {
    codigo: string; nombre: string; ruta: string;
    icono?: string; orden?: number;
  }): Observable<ProyectoDetalle> {
    return this.http.post<ProyectoDetalle>(`${this.base}/proyectos/${proyectoId}/vistas`, dto);
  }

  // ── Permisos ──────────────────────────────────────────────────────

  getMatrizUsuario(usuarioId: number): Observable<MatrizPermisos> {
    return this.http.get<MatrizPermisos>(`${this.base}/permisos/usuario/${usuarioId}`);
  }

  getMatrizRol(rolId: number): Observable<MatrizPermisos> {
    return this.http.get<MatrizPermisos>(`${this.base}/permisos/rol/${rolId}`);
  }

  upsertPermisoUsuario(req: AsignarPermisoRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/permisos/usuario`, req);
  }

  upsertPermisoRol(req: AsignarPermisoRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/permisos/rol`, req);
  }

  revocarPermisoUsuario(usuarioId: number, proyectoId: number, vistaId?: number): Observable<void> {
    let params = new HttpParams()
      .set('usuarioId', usuarioId)
      .set('proyectoId', proyectoId);
    if (vistaId != null) params = params.set('vistaId', vistaId);
    return this.http.delete<void>(`${this.base}/permisos/usuario`, { params });
  }

  revocarPermisoRol(rolId: number, proyectoId: number, vistaId?: number): Observable<void> {
    let params = new HttpParams()
      .set('rolId', rolId)
      .set('proyectoId', proyectoId);
    if (vistaId != null) params = params.set('vistaId', vistaId);
    return this.http.delete<void>(`${this.base}/permisos/rol`, { params });
  }

  // ── Exportar ──────────────────────────────────────────────────────

  exportarExcel(): Observable<Blob> {
    return this.http.get(`${this.base}/dashboard/exportar/excel`, { responseType: 'blob' });
  }

  exportarPdf(): Observable<Blob> {
    return this.http.get(`${this.base}/dashboard/exportar/pdf`, { responseType: 'blob' });
  }

    // 1. Obtener el uso de cada módulo (para las tarjetas de "Apps")
  getUsoModulos(): Observable<ModuloUsage[]> {
    return this.http.get<ModuloUsage[]>(`${this.base}/dashboard/modulos-usage`);
  }

  // 2. Obtener alertas activas del sistema
  getAlertasActivas(): Observable<AlertaSA[]> {
    return this.http.get<AlertaSA[]>(`${this.base}/dashboard/alertas`);
  }

  // 3. Obtener logs recientes (con límite opcional)
  getLogsRecientes(limit: number = 5): Observable<AccesoLog[]> {
    let params = new HttpParams().set('limit', limit.toString());
    return this.http.get<AccesoLog[]>(`${this.base}/dashboard/logs-recientes`, { params });
  }
}