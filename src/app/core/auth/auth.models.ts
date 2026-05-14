// auth.models.ts
// Modelos alineados con SuperAdmin v3.0

export interface LoginMaestroRequest {
  username: string;
  password: string;
  plataforma: string; // "Web"
}

// Respuesta del backend POST /api/superadmin/auth/login-maestro
export interface AuthMaestroResponse {
  accessToken: string;
  refreshToken: string;
  expiracion: string;        // DateTime UTC como string
  usuario: UsuarioToken;
  proyectosAccesibles: ProyectoAcceso[];
}

export interface LoginDirectoRequest {
  username: string;
  password: string;
  codigoProyecto: string;   // ej: "acceso-control"
  plataforma: string;       // "Web"
}

export interface AuthResultResponse {
  accessToken: string;
  refreshToken: string;
  expiracion: string;
  usuario: UsuarioToken;
}

export interface UsuarioToken {
  id: number;
  nombreCompleto: string;
  username: string;
  email?: string;
}

export interface ProyectoAcceso {
  id: number;
  codigo: string;
  nombre: string;
  plataforma: string;
  iconoCss?: string;
  urlBase?: string;
  rolEnProyecto: string;    // nombre del rol que tiene en ese proyecto
  nivelRol: number;
}

// Sesión guardada en localStorage
export interface SesionActiva {
  token: string;
  refreshToken: string;
  expiracion: string;
  usuario: UsuarioToken;
  proyectosAccesibles: ProyectoAcceso[];
  proyectoActivo?: ProyectoAcceso; // proyecto seleccionado actualmente
}

export interface VistaMenu {
  id: number;
  codigo: string;
  nombre: string;
  ruta: string;
  icono?: string;
  orden: number;
  esContenedor: boolean;
  hijos: VistaMenu[];
}