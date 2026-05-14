// ── DASHBOARD ──────────────────────────────────────
export interface DashboardGlobalDto {
  totalUsuariosActivos: number;
  totalUsuariosInactivos: number;
  totalProyectosActivos: number;
  proyectosProduccion: number;
  proyectosMantenimiento: number;
  proyectosDesarrollo: number;
  usuariosBloqueados: number;
  alertasCriticasNoResueltas: number;
  graficoAccesos: GraficoAccesosDto[];
  proyectosMasAccesos: ProyectoActividadDto[];
  usuariosMasActividad: UsuarioActividadDto[];
  proyectosConProblemas: ProyectoConAlertasDto[];
}

export interface GraficoAccesosDto {
  fecha: string; // yyyy-MM-dd
  exitosos: number;
  fallidos: number;
}

export interface ProyectoActividadDto {
  proyectoId: number;
  nombreProyecto: string;
  cantidadAccesos: number;
}

export interface UsuarioActividadDto {
  usuarioId: number;
  nombreUsuario: string;
  cantidadAccesos: number;
}

export interface ProyectoConAlertasDto {
  proyectoId: number;
  codigo: string;
  nombre: string;
  estado: string;
  cantidadAlertasCriticas: number;
}

export interface DashboardProyectoDto {
  proyectoId: number;
  nombre: string;
  codigo: string;
  descripcion: string;
  estado: string;
  plataforma: string;
  version: string | null;
  urlBase: string | null;
  usuariosAsignados: number;
  rolesDefinidos: number;
  vistasConfiguradas: number;
  tokensActivos: number;
  ultimosAccesos: UltimoAccesoDto[];
  usuariosActivosHoy: number;
  alertasAbiertas: number;
}

export interface UltimoAccesoDto {
  username: string;
  fecha: string; // ISO 8601
}

// ── ALERTAS ────────────────────────────────────────
export interface AlertaDto {
  id: number;
  proyectoId: number | null;
  proyectoCodigo: string | null;
  tipo: string;        // 'critical' | 'error' | 'warning' | 'info'
  titulo: string;
  mensaje: string;
  fecha: string;
  resuelta: boolean;
  accionUrl: string | null;
}

export interface FiltroAlertasDto {
  proyectoId?: number;
  tipo?: string;
  resuelta?: boolean;
  desde?: string;
  hasta?: string;
  pagina?: number;
  tamanoPagina?: number;
}

// ── AUDITORÍA ──────────────────────────────────────
export interface AuditoriaDto {
  entidadAfectada: string;
  nombreEntidad: string;
  registroId: number | null;
  accion: string;
  usuarioResponsable: string;
  fecha: string;
}

export interface FiltroAuditoriaDto {
  usuario?: string;
  entidad?: string;
  accion?: string;
  desde?: string;
  hasta?: string;
  pagina?: number;
  tamanoPagina?: number;
}

// ── CONFIGURACIÓN ─────────────────────────────────
export interface ConfiguracionSistemaDto {
  maxIntentosFallidos: number;
  minutosBloqueo: number;
  expiracionRefreshTokenHoras: number;
  expiracionAccessTokenMinutos: number;
  requiereQRParaMobile: boolean;
}

// ── DELEGACIONES ──────────────────────────────────
export interface DelegacionDto {
  otorgadoPor: string;
  otorgadoA: string;
  proyectoCodigo: string;
  proyectoNombre: string;
  rol: string;
  fechaAsignacion: string;
}

export interface FiltroDelegacionesDto {
  proyectoId?: number;
  pagina?: number;
  tamanoPagina?: number;
}

// ── DISPOSITIVOS ──────────────────────────────────
export interface DispositivoDto {
  id: number;
  plataforma: string;
  deviceToken: string | null;
  fcmToken: string | null;
  dispositivoInfo: string | null;
  proyectoCodigo: string;
  activo: boolean;
  fechaCreacion: string;
}

export interface RegistrarDispositivoRequest {
  fcmToken?: string;
  deviceToken?: string;
  dispositivoInfo?: string;
}

// ── MENÚ DINÁMICO ─────────────────────────────────
export interface VistaMenuDto {
  id: number;
  codigo: string;
  nombre: string;
  ruta: string;
  icono: string | null;
  orden: number;
  esContenedor: boolean;
  hijos: VistaMenuDto[];
}

// ── PROYECTOS ─────────────────────────────────────
export interface ProyectoListDto {
  id: number;
  codigo: string;
  nombre: string;
  plataforma: string;
  iconoCss: string | null;
  estado: string;
  version: string | null;
  orden: number;
  activo: boolean;
}

export interface ProyectoDetalleDto {
  id: number;
  codigo: string;
  nombre: string;
  plataforma: string;
  iconoCss: string | null;
  urlBase: string | null;
  estado: string;
  version: string | null;
  descripcion: string | null;
  orden: number;
  activo: boolean;
  roles: RolDto[];
  vistas: VistaDto[];
}

export interface RolDto {
  id: number;
  nombre: string;
  nivel: number;
  descripcion: string | null;
  activo: boolean;
}

export interface ActualizarRolRequest {
  nombre: string;
  nivel: number;
  descripcion?: string | null;
  activo: boolean;
}

export interface VistaDto {
  id: number;
  codigo: string;
  nombre: string;
  ruta: string;
  icono: string | null;
  descripcion: string | null;
  orden: number;
  activo: boolean;
  vistaPadreId: number | null;
  esContenedor: boolean;
}

export interface ActualizarVistaRequest {
  codigo: string;
  nombre: string;
  ruta: string;
  icono?: string | null;
  descripcion?: string | null;
  vistaPadreId?: number | null;
  esContenedor: boolean;
  orden: number;
  activo: boolean;
}

// Requests
export interface CrearProyectoRequest {
  codigo: string;
  nombre: string;
  plataforma: string;
  iconoCss?: string;
  urlBase?: string;
  version?: string;
  descripcion?: string;
  orden?: number;
}

export interface ActualizarProyectoRequest {
  nombre: string;
  plataforma: string;
  iconoCss?: string;
  urlBase?: string;
  estado: string;
  version?: string;
  descripcion?: string;
  orden: number;
}

export interface CrearRolRequest {
  nombre: string;
  nivel: number;
  descripcion?: string;
}

export interface CrearVistaRequest {
  codigo: string;
  nombre: string;
  ruta: string;
  icono?: string;
  descripcion?: string;
  vistaPadreId?: number;
  esContenedor?: boolean;
  orden?: number;
}

export interface UsuarioProyectoDto {
  usuarioId: number;
  username: string;
  nombreCompleto: string;
  email: string | null;
  rol: string;
  nivelRol: number;
  activo: boolean;        // Estado de la asignación (no del usuario)
  creadoPor: string;
  fechaAsignacion: string; // ISO DateTime
}

// ── LOGS DE ACCESO ────────────────────────────────
export interface LogAccesoDto {
  id: number;
  usernameUsado: string;
  nombreCompleto: string | null;
  proyectoCodigo: string | null;
  exitoso: boolean;
  ipAddress: string | null;
  plataforma: string | null;
  detalle: string | null;
  fecha: string;
}

export interface FiltroLogsDto {
  username?: string;
  proyectoCodigo?: string;
  desde?: string;
  hasta?: string;
  plataforma?: string;
  exitoso?: boolean;
  pagina?: number;
  tamanoPagina?: number;
}

// ── SESIONES ACTIVAS ──────────────────────────────
export interface SesionActivaDto {
  id: number;
  username: string;
  proyectoCodigo: string | null;
  plataforma: string;
  tokenReducido: string;
  fechaExpiracion: string;
  fechaCreacion: string;
  ipCreacion: string | null;
  revocado: boolean;
}

export interface FiltroSesionesDto {
  usuarioId?: number;
  proyectoId?: number;
  pagina?: number;
  tamanoPagina?: number;
}

// ── USUARIOS ──────────────────────────────────────
export interface UsuarioListDto {
  id: number;
  nombreCompleto: string;
  username: string;
  email: string | null;
  activo: boolean;
  fechaCreacion: string;
  ultimoAcceso: string | null;
  bloqueadoHasta: string | null;
}

export interface UsuarioDetalleDto {
  id: number;
  nombreCompleto: string;
  username: string;
  email: string | null;
  qrCode: string | null;
  activo: boolean;
  ultimoAcceso: string;
  proyectos: ProyectoAsignadoDto[];
  intentosFallidos: number;
  bloqueadoHasta: string | null;
  creadoPor: string | null;
  fechaCreacion: string;
  modificadoPor: string | null;
  fechaModificacion: string | null;
}

export interface ProyectoAsignadoDto {
  proyectoId: number;
  codigoProyecto: string;
  nombreProyecto: string;
  rol: string;
  nivelRol: number;
  activo: boolean;
}

export interface CrearUsuarioRequest {
  nombreCompleto: string;
  username: string;
  email?: string;
  password: string;
}

export interface ActualizarUsuarioRequest {
  nombreCompleto: string;
  email?: string | null;
  password?: string | null;
}

export interface AsignarProyectoRolRequest {
  proyectoId: number;
  rolId: number;
}

export interface ProyectoOrdenDto {
  id: number;
  orden: number;
}
 
export interface ReordenarProyectosRequest {
  items: ProyectoOrdenDto[];
}

// ── VISIBILIDAD / ACCESO A VISTAS ─────────────────
export interface VistaAccesoUsuarioDto {
  vistaId: number;
  codigo: string;
  nombre: string;
  ruta: string;
  orden: number;
  tieneAcceso: boolean;
}

export interface PagedResult<T> {
  items: T[];
  totalRegistros: number;
  pagina: number;
  tamanoPagina: number;
}