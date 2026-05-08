// superadmin.models.ts
// Rocland — Módulo Super Admin
// Interfaces alineadas con los DTOs del backend (RCD.SuperAdmin)

// ── Dashboard KPIs ────────────────────────────────────────────────
export interface SuperAdminDashboardKpis {
  usuariosActivos:      number;
  usuariosConectados:   number;
  modulosTotales:       number;
  accesosDiarios:       number;
  alertasAbiertas:      number;
  nuevosUsuariosMes:    number;
}

// ── Logs de acceso (espeja TBL_ROCLAND_SUPERADMIN_LOGS_ACCESO) ────
export interface AccesoLog {
  usuarioId:       number | null;
  nombreCompleto:  string;
  username:        string;
  exitoso:         boolean;
  ipAddress:       string;
  plataforma:      string;
  detalle:         string;
  fecha:           string; // ISO
}

export interface AccesoLogPaginado {
  items: AccesoLog[];
  total: number;
}

// ── Módulos / Proyectos ───────────────────────────────────────────
export interface ModuloUsage {
  proyectoId:  number;
  codigo:      string;
  nombre:      string;
  plataforma:  string;
  iconoCss:    string; // Ej. 'bi-shield-lock'
  version:     string; // Ej. 'v1.2.0'
  estado:      'Produccion' | 'Mantenimiento' | 'Desarrollo';
  usuariosActivos: number; // Cuántos lo están usando hoy
}

// Espeja ProyectoDetalleDto del backend
export interface ProyectoDetalle {
  id:       number;
  codigo:   string;
  nombre:   string;
  plataforma: string;
  urlBase:  string | null;
  iconoCss: string | null;
  orden:    number;
  activo:   boolean;
  vistas:   VistaDetalle[];
}

export interface VistaDetalle {
  id:     number;
  codigo: string;
  nombre: string;
  icono:  string | null;
  orden:  number;
  ruta:   string;
}

// ── Usuarios (directorio global) ──────────────────────────────────
// Espeja UsuarioDto del backend
export interface UsuarioSA {
  id:              number;
  nombreCompleto:  string;
  username:        string;
  email:           string | null;
  activo:          boolean;
  ultimoAcceso:    string | null; // ISO
  roles:           string[];
}

export interface UsuariosPaginados {
  items: UsuarioSA[];
  total: number;
}

export interface CrearUsuarioSARequest {
  nombreCompleto: string;
  username:       string;
  email?:         string;
  password:       string;
  rolIds:         number[];
}

export interface ActualizarUsuarioSARequest {
  nombreCompleto: string;
  email?:         string;
  activo:         boolean;
  rolIds:         number[];
}

// ── Roles ─────────────────────────────────────────────────────────
export interface RolSA {
  id:     number;
  nombre: string;
  activo: boolean;
}

// ── Permisos ──────────────────────────────────────────────────────
// Espeja MatrizPermisosDto del backend
export interface MatrizPermisos {
  entidadId: number;
  nombre:    string;
  tipo:      'Rol' | 'Usuario';
  proyectos: ProyectoMatriz[];
}

export interface ProyectoMatriz {
  id:      number;
  codigo:  string;
  nombre:  string;
  permiso: PermisoCrud | null;
  vistas:  VistaMatriz[];
}

export interface VistaMatriz {
  id:      number;
  codigo:  string;
  nombre:  string;
  icono:   string | null;
  permiso: PermisoCrud | null;
}

export interface PermisoCrud {
  puedeLeer:   boolean;
  puedeCrear:  boolean;
  puedeEditar: boolean;
  puedeBorrar: boolean;
}

export interface AsignarPermisoRequest {
  rolId?:      number;
  usuarioId?:  number;
  proyectoId:  number;
  vistaId?:    number | null;
  puedeLeer:   boolean;
  puedeCrear:  boolean;
  puedeEditar: boolean;
  puedeBorrar: boolean;
}

// ── Alertas ───────────────────────────────────────────────────────
export interface AlertaSA {
  id:       number;
  tipo:     'warning' | 'error' | 'info' | 'critical';
  titulo:   string;
  mensaje:  string;
  fecha:    string;
  resuelta: boolean;
  accionUrl?: string; // Para que el admin haga clic y vaya a resolverlo
}

// ── Gráfica accesos semana ────────────────────────────────────────
export interface AccesosDiaSemana {
  dia:      string;   // 'Lun', 'Mar', etc.
  exitosos: number;
  fallidos: number;
}

// ── Proyectos permitidos (post-login) ─────────────────────────────
// Espeja ProyectoPermitidoDto del backend (ya existía)
export interface ProyectoPermitido {
  id:          number;
  codigo:      string;
  nombre:      string;
  plataforma:  string;
  urlBase:     string | null;
  iconoCss:    string | null;
  accesoTotal: boolean;
  puedeLeer:   boolean;
  puedeCrear:  boolean;
  puedeEditar: boolean;
  puedeBorrar: boolean;
  vistas:      VistaPermitida[];
}

export interface VistaPermitida {
  id:          number;
  codigo:      string;
  nombre:      string;
  ruta:        string;
  icono:       string | null;
  puedeLeer:   boolean;
  puedeCrear:  boolean;
  puedeEditar: boolean;
  puedeBorrar: boolean;
}