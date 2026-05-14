// superadmin.service.ts
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/Environment';
import { Injectable, inject } from '@angular/core';
import {
  // ── Dashboard ────────────────────────────
  DashboardGlobalDto,
  DashboardProyectoDto,
  // ── Alertas ──────────────────────────────
  AlertaDto,
  FiltroAlertasDto,
  // ── Auditoría ────────────────────────────
  AuditoriaDto,
  FiltroAuditoriaDto,
  // ── Configuración ────────────────────────
  ConfiguracionSistemaDto,
  // ── Delegaciones ─────────────────────────
  DelegacionDto,
  FiltroDelegacionesDto,
  // ── Dispositivos ─────────────────────────
  DispositivoDto,
  RegistrarDispositivoRequest,
  // ── Logs de acceso ───────────────────────
  LogAccesoDto,
  FiltroLogsDto,
  // ── Menú dinámico ────────────────────────
  VistaMenuDto,
  // ── Proyectos ────────────────────────────
  ProyectoListDto,
  ProyectoDetalleDto,
  RolDto,
  VistaDto,
  CrearProyectoRequest,
  ActualizarProyectoRequest,
  CrearRolRequest,
  CrearVistaRequest,
  ActualizarRolRequest,
  ActualizarVistaRequest,
  UsuarioProyectoDto,
  ProyectoOrdenDto,
  // ── Sesiones ─────────────────────────────
  SesionActivaDto,
  FiltroSesionesDto,
  // ── Usuarios ─────────────────────────────
  UsuarioListDto,
  UsuarioDetalleDto,
  CrearUsuarioRequest,
  ActualizarUsuarioRequest,
  AsignarProyectoRolRequest,
  // ── Visibilidad ──────────────────────────
  VistaAccesoUsuarioDto,
  // ── Paginación genérica ──────────────────
  PagedResult
} from '../models/superadmin.models';

@Injectable({ providedIn: 'root' })
export class SuperadminService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/superadmin`;

  // ═══════════════════════════════════════════════════════════════
  // DASHBOARD
  // ═══════════════════════════════════════════════════════════════
  getDashboardGlobal(): Observable<DashboardGlobalDto> {
    return this.http.get<DashboardGlobalDto>(`${this.base}/dashboard/global`);
  }

  getDashboardProyecto(proyectoId: number): Observable<DashboardProyectoDto> {
    return this.http.get<DashboardProyectoDto>(`${this.base}/dashboard/proyecto/${proyectoId}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // ALERTAS
  // ═══════════════════════════════════════════════════════════════
  getAlertas(resuelta?: boolean, tipo?: string, pagina: number = 1, tamanoPagina: number = 20): Observable<PagedResult<AlertaDto>> {
    let params = new HttpParams()
      .set('pagina', pagina.toString())
      .set('tamanoPagina', tamanoPagina.toString());
    if (resuelta !== undefined) params = params.set('Resuelta', resuelta.toString());
    if (tipo) params = params.set('Tipo', tipo);
    return this.http.get<PagedResult<AlertaDto>>(`${this.base}/alertas`, { params });
  }

  marcarAlertaResuelta(id: number): Observable<void> {
    return this.http.patch<void>(`${this.base}/alertas/${id}/resolver`, null);
  }

  // ═══════════════════════════════════════════════════════════════
  // AUDITORÍA
  // ═══════════════════════════════════════════════════════════════
  getAuditoria(filtro: FiltroAuditoriaDto = {}): Observable<PagedResult<AuditoriaDto>> {
    let params = this.buildHttpParams(filtro);
    return this.http.get<PagedResult<AuditoriaDto>>(`${this.base}/auditoria`, { params });
  }

  // ═══════════════════════════════════════════════════════════════
  // CONFIGURACIÓN
  // ═══════════════════════════════════════════════════════════════
  getConfiguracion(): Observable<ConfiguracionSistemaDto> {
    return this.http.get<ConfiguracionSistemaDto>(`${this.base}/configuracion`);
  }

  updateConfiguracion(dto: ConfiguracionSistemaDto): Observable<void> {
    return this.http.put<void>(`${this.base}/configuracion`, dto);
  }

  // ═══════════════════════════════════════════════════════════════
  // DELEGACIONES
  // ═══════════════════════════════════════════════════════════════
  getDelegaciones(filtro: FiltroDelegacionesDto = {}): Observable<PagedResult<DelegacionDto>> {
    let params = this.buildHttpParams(filtro);
    return this.http.get<PagedResult<DelegacionDto>>(`${this.base}/delegaciones`, { params });
  }

  // ═══════════════════════════════════════════════════════════════
  // DISPOSITIVOS
  // ═══════════════════════════════════════════════════════════════
  registrarDispositivo(request: RegistrarDispositivoRequest): Observable<void> {
    return this.http.post<void>(`${this.base}/dispositivos/token`, request);
  }

  getDispositivosUsuario(usuarioId: number, pagina: number = 1, tamanoPagina: number = 20): Observable<PagedResult<DispositivoDto>> {
    let params = new HttpParams()
      .set('pagina', pagina.toString())
      .set('tamanoPagina', tamanoPagina.toString());
    return this.http.get<PagedResult<DispositivoDto>>(`${this.base}/dispositivos/usuarios/${usuarioId}`, { params });
  }

  revocarDispositivo(dispositivoId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/dispositivos/${dispositivoId}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // LOGS DE ACCESO
  // ═══════════════════════════════════════════════════════════════
  getLogsAcceso(filtros: FiltroLogsDto = {}, pagina: number = 1, tamanoPagina: number = 10): Observable<PagedResult<LogAccesoDto>> {
    let params = new HttpParams()
      .set('Pagina', pagina.toString())           // ← mayúscula
      .set('TamanoPagina', tamanoPagina.toString()); // ← mayúscula
    if (filtros.username) params = params.set('Username', filtros.username);
    if (filtros.proyectoCodigo) params = params.set('ProyectoCodigo', filtros.proyectoCodigo);
    if (filtros.desde) params = params.set('Desde', filtros.desde);
    if (filtros.hasta) params = params.set('Hasta', filtros.hasta);
    if (filtros.plataforma) params = params.set('Plataforma', filtros.plataforma);
    if (filtros.exitoso !== undefined) params = params.set('Exitoso', filtros.exitoso.toString());
    return this.http.get<PagedResult<LogAccesoDto>>(`${this.base}/logsacceso`, { params });
  }

  // Método de conveniencia para los últimos accesos
  getUltimosAccesos(cantidad: number = 10): Observable<LogAccesoDto[]> {
    let params = new HttpParams()
      .set('Desde', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .set('pagina', '1')
      .set('tamanoPagina', cantidad.toString());
    return this.http.get<LogAccesoDto[]>(`${this.base}/logsacceso`, { params }); // si el backend aún no usa PagedResult aquí, mantenemos array simple
  }

  // ═══════════════════════════════════════════════════════════════
  // MENÚ DINÁMICO
  // ═══════════════════════════════════════════════════════════════
  getMenu(proyectoId: number): Observable<VistaMenuDto[]> {
    return this.http.get<VistaMenuDto[]>(`${this.base}/menu/${proyectoId}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // PROYECTOS
  // ═══════════════════════════════════════════════════════════════
  getProyectos(): Observable<ProyectoListDto[]> {
    return this.http.get<ProyectoListDto[]>(`${this.base}/proyectos`);
  }

  getProyectoDetalle(id: number): Observable<ProyectoDetalleDto> {
    return this.http.get<ProyectoDetalleDto>(`${this.base}/proyectos/${id}`);
  }

  getProyectoPorCodigo(codigo: string): Observable<ProyectoDetalleDto> {
    return this.http.get<ProyectoDetalleDto>(`${this.base}/proyectos/codigo/${codigo}`);
  }

  crearProyecto(dto: CrearProyectoRequest): Observable<ProyectoDetalleDto> {
    return this.http.post<ProyectoDetalleDto>(`${this.base}/proyectos`, dto);
  }

  actualizarProyecto(id: number, dto: ActualizarProyectoRequest): Observable<ProyectoDetalleDto> {
    return this.http.put<ProyectoDetalleDto>(`${this.base}/proyectos/${id}`, dto);
  }

  desactivarProyecto(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/proyectos/${id}`);
  }

  activarProyecto(id: number): Observable<void> {
    return this.http.put<void>(`${this.base}/proyectos/${id}/activar`, {});
  }

  reordenarProyectos(items: ProyectoOrdenDto[]): Observable<void> {
    return this.http.put<void>(`${this.base}/proyectos/reordenar`, { items });
  }

  // Roles del proyecto
  getRolesProyecto(proyectoId: number): Observable<RolDto[]> {
    return this.http.get<RolDto[]>(`${this.base}/proyectos/${proyectoId}/roles`);
  }

  crearRolProyecto(proyectoId: number, dto: CrearRolRequest): Observable<RolDto> {
    return this.http.post<RolDto>(`${this.base}/proyectos/${proyectoId}/roles`, dto);
  }

  eliminarRolProyecto(proyectoId: number, rolId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/proyectos/${proyectoId}/roles/${rolId}`);
  }

  actualizarRolProyecto(proyectoId: number, rolId: number, dto: ActualizarRolRequest): Observable<RolDto> {
    return this.http.put<RolDto>(`${this.base}/proyectos/${proyectoId}/roles/${rolId}`, dto);
  }

  activarRolProyecto(proyectoId: number, rolId: number): Observable<void> {
    return this.http.put<void>(`${this.base}/proyectos/${proyectoId}/roles/${rolId}/activar`, {});
  }

  // Vistas del proyecto
  getVistasProyecto(proyectoId: number): Observable<VistaDto[]> {
    return this.http.get<VistaDto[]>(`${this.base}/proyectos/${proyectoId}/vistas`);
  }

  crearVistaProyecto(proyectoId: number, dto: CrearVistaRequest): Observable<VistaDto> {
    return this.http.post<VistaDto>(`${this.base}/proyectos/${proyectoId}/vistas`, dto);
  }

  eliminarVistaProyecto(proyectoId: number, vistaId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/proyectos/${proyectoId}/vistas/${vistaId}`);
  }

  actualizarVistaProyecto(proyectoId: number, vistaId: number, dto: ActualizarVistaRequest): Observable<VistaDto> {
    return this.http.put<VistaDto>(`${this.base}/proyectos/${proyectoId}/vistas/${vistaId}`, dto);
  }

  activarVistaProyecto(proyectoId: number, vistaId: number): Observable<void> {
    return this.http.put<void>(`${this.base}/proyectos/${proyectoId}/vistas/${vistaId}/activar`, {});
  }

  getUsuariosPorProyecto(proyectoId: number, pagina: number = 1, tamanoPagina: number = 20): Observable<PagedResult<UsuarioProyectoDto>> {
    let params = new HttpParams()
      .set('pagina', pagina.toString())
      .set('tamanoPagina', tamanoPagina.toString());
    return this.http.get<PagedResult<UsuarioProyectoDto>>(`${this.base}/proyectos/${proyectoId}/usuarios`, { params });
  }

  // ═══════════════════════════════════════════════════════════════
  // SESIONES ACTIVAS
  // ═══════════════════════════════════════════════════════════════
  getSesiones(filtro: FiltroSesionesDto = {}): Observable<PagedResult<SesionActivaDto>> {
    let params = this.buildHttpParams(filtro);
    return this.http.get<PagedResult<SesionActivaDto>>(`${this.base}/sesiones`, { params });
  }

  revocarSesion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/sesiones/${id}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // USUARIOS
  // ═══════════════════════════════════════════════════════════════
  getUsuarios(pagina: number = 1, tamanoPagina: number = 20, soloPanel: boolean = false, activo?: boolean): Observable<PagedResult<UsuarioListDto>> {
      let params = new HttpParams()
          .set('pagina', pagina.toString())
          .set('tamanoPagina', tamanoPagina.toString())
          .set('soloPanel', soloPanel.toString());
      if (activo !== undefined) params = params.set('activo', activo.toString());
      return this.http.get<PagedResult<UsuarioListDto>>(`${this.base}/usuarios`, { params });
  }

  getUsuario(id: number): Observable<UsuarioDetalleDto> {
    return this.http.get<UsuarioDetalleDto>(`${this.base}/usuarios/${id}`);
  }

  crearUsuario(dto: CrearUsuarioRequest): Observable<UsuarioDetalleDto> {
    return this.http.post<UsuarioDetalleDto>(`${this.base}/usuarios`, dto);
  }

  actualizarUsuario(id: number, dto: ActualizarUsuarioRequest): Observable<UsuarioDetalleDto> {
    return this.http.put<UsuarioDetalleDto>(`${this.base}/usuarios/${id}`, dto);
  }

  desactivarUsuario(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/usuarios/${id}`);
  }

  activarUsuario(id: number): Observable<void> {
    return this.http.put<void>(`${this.base}/usuarios/${id}/activar`, {});
  }

  resetearIntentos(id: number): Observable<void> {
    return this.http.put<void>(`${this.base}/usuarios/${id}/reset-intentos`, null);
  }

  asignarProyectoRol(usuarioId: number, dto: AsignarProyectoRolRequest): Observable<void> {
    return this.http.post<void>(`${this.base}/usuarios/${usuarioId}/proyectos`, dto);
  }

  revocarProyecto(usuarioId: number, proyectoId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/usuarios/${usuarioId}/proyectos/${proyectoId}`);
  }

  actualizarVistasAcceso(usuarioId: number, proyectoId: number, vistaIds: number[]): Observable<void> {
    return this.http.put<void>(`${this.base}/usuarios/${usuarioId}/proyectos/${proyectoId}/vistas`, vistaIds);
  }

  // ═══════════════════════════════════════════════════════════════
  // VISIBILIDAD (Acceso a vistas por usuario)
  // ═══════════════════════════════════════════════════════════════
  getVistasAcceso(usuarioId: number, proyectoId: number): Observable<VistaAccesoUsuarioDto[]> {
    return this.http.get<VistaAccesoUsuarioDto[]>(
      `${this.base}/visibilidad/usuarios/${usuarioId}/proyectos/${proyectoId}/vistas`
    );
  }

  actualizarVistaAcceso(usuarioId: number, vistaId: number, tieneAcceso: boolean): Observable<void> {
    return this.http.put<void>(
      `${this.base}/visibilidad/usuarios/${usuarioId}/vistas/${vistaId}`,
      tieneAcceso
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════
  /**
   * Construye HttpParams a partir de un objeto filtro plano.
   * Ignora propiedades undefined/null y las transforma en parámetros de query.
   */
  private buildHttpParams(filtro: Record<string, any>): HttpParams {
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