// auth.models.ts
// Rocland — Modelos de Autenticación

export interface LoginRequest {
  username:  string;
  password: string;
  plataforma: string;
}

export interface VistaPermitida {
  id: number;
  nombre: string;
  ruta: string;
  icono?: string;
}

export interface ProyectoPermitido {
  id: number;
  codigo: string;
  nombre: string;
  plataforma: string;
  accesoTotal: boolean;
  puedeLeer: boolean;
  puedeCrear: boolean;
  puedeEditar: boolean;
  puedeBorrar: boolean;
  vistas: VistaPermitida[]; // Controla qué menús verá el usuario
}

// Actualizamos el LoginResponse para que coincida con el Backend
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpira: string;
  nombreCompleto: string;
  username: string;
  roles: string[];
  proyectosPermitidos: ProyectoPermitido[];
}

// Espeja el PerfilDto de Acceso Control
export interface PerfilModulo {
  id: number;
  superAdminUsuarioId: number;
  nombreCompleto: string;
  tipoPerfil: string; // "Guardia", "Supervisor", "Administrador"
  activo: boolean;
}

// ── Sesión activa (lo que guardamos en localStorage) ─────────────
export interface SesionActiva {
  perfilId: number;
  token: string;
  refreshToken: string;
  nombre: string;
  rolesSuperAdmin: string[];
  rolModulo: RolUsuario;
  expiracion: string;
  proyectoId: string;
  proyectoNombre: string;
  vistasPermitidas: string[];
  permisos: {
    puedeLeer: boolean;
    puedeCrear: boolean;
    puedeEditar: boolean;
    puedeBorrar: boolean;
  };
}

// ── Definición de un Proyecto/Módulo ─────────────────────────────
export interface ProyectoDisponible {
  id: string; // Debe coincidir con el 'codigo' de SuperAdmin (ej. 'acceso-control-web')
  nombre: string;
  descripcion: string;
  icono: string;
  rutaBase: string;
  activo: boolean;
}

// ── Roles disponibles ─────────────────────────────────────────────
export type RolUsuario = 'Guardia' | 'Admin' | 'Supervisor';

