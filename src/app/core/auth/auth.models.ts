// auth.models.ts
// Rocland — Modelos de Autenticación
// Sprint 4

// ── Petición de login ─────────────────────────────────────────────
// Espeja: LoginRequest (AuthDTOs.cs)
export interface LoginRequest {
  usuario:  string;
  password: string;
}

// ── Respuesta de login ────────────────────────────────────────────
// Espeja: LoginResponse (AuthDTOs.cs)
export interface LoginResponse {
  token:      string;
  nombre:     string;
  rol:        RolUsuario;   // "Guardia" | "Admin" | "Supervisor"
  id:         number;
  expiracion: string;       // ISO string — se parsea con new Date()
}

// ── Roles disponibles ─────────────────────────────────────────────
export type RolUsuario = 'Guardia' | 'Admin' | 'Supervisor';

// ── Sesión activa (lo que guardamos en localStorage) ─────────────
export interface SesionActiva {
  token:       string;
  nombre:      string;
  rol:         RolUsuario;
  id:          number;
  expiracion:  string;
  proyectoId:  string;      // ej. 'acceso-control-web'
  proyectoNombre: string;   // ej. 'AccesoControl Web'
}

// ── Definición de un Proyecto/Módulo ─────────────────────────────
// Esta interfaz modela cada proyecto que aparece en el selector del login.
// Sprint 4: se instancia como array hardcodeado en proyecto-catalog.ts
// Sprint futuro: vendrá de GET /api/super-admin/proyectos?usuarioId=xxx
export interface ProyectoDisponible {
  id:          string;       // clave única del proyecto, ej. 'acceso-control-web'
  nombre:      string;       // nombre legible, ej. 'AccesoControl Web'
  descripcion: string;       // texto corto debajo del nombre en el selector
  icono:       string;       // clase Bootstrap Icons, ej. 'bi-shield-lock'
  loginEndpoint: {
    admin:   string;         // URL del endpoint POST para admin/supervisor
    guardia: string;         // URL del endpoint POST para guardia (si aplica)
  };
  rolesPermitidos: RolUsuario[];  // qué roles pueden acceder a este proyecto
  rutaBase:    string;       // ruta Angular de destino post-login, ej. '/private/acceso-control-web'
  activo:      boolean;      // si aparece en el selector o no
}