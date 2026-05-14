// admin.models.ts
// Modelos alineados con AdminController y OperacionesController

// ── Dashboard ──────────────────────────────────────────────────────
export interface DashboardKpis {
  dentroAhora: number;
  accesosHoy: number;
  visitantesHoy: number;
  proveedoresHoy: number;
  tiempoPromedio: number;
  solicitudesPendientes: number;
}

// ── Zona / Activos ─────────────────────────────────────────────────
export interface AccesoActivoResponse {
  registroId: number;
  tipoRegistro: string;
  nombrePersona: string;
  empresa?: string;
  numeroGafete: string;
  fechaEntrada: string;
  area: string;
  minutosLlevaDentro: number;
}

// ── KPIs secundarios ───────────────────────────────────────────────
export interface FlujoPorHoraDto {
  hora: number;
  total: number;
}

export interface AreaVisitadaDto {
  area: string;
  total: number;
}

export interface FlujoDiarioDto {
  fecha: string;
  visitantes: number;
  proveedores: number;
}

// ── Personas ───────────────────────────────────────────────────────
export interface PersonaPerfilDto {
  id: number;
  nombre: string;
  tipoIdentificacion: string;  // nombre del tipo de ID
  numeroIdentificacion: string;
  empresa?: string;
  telefono?: string;
  email?: string;
  totalVisitas: number;
  fechaRegistro: string;
  fechaUltimaVisita?: string;
}

export interface PersonasPaginadas {
  items: PersonaPerfilDto[];
  total: number;
}

// ── Historial (ítem individual) ────────────────────────────────────
export interface HistorialAccesoItemDto {
  id: number;
  tipo: string;
  nombre: string;
  empresa?: string;
  numeroIdentificacion: string;
  area?: string;
  motivo: string;
  fechaEntrada: string;
  fechaSalida?: string | null;
  minutosEstancia?: number | null;
  estadoAcceso: string;
  codigoGafete?: string;
  guardia: string;           // NombreCompleto del perfil
}

// ── Guardias (Perfiles) ────────────────────────────────────────────
export interface GuardiaResumen {
  id: number;
  nombre: string;            // NombreCompleto del perfil
  usuario: string;           // Número de empleado o "N/A"
  rol: string;               // Turno o "Sin turno"
  activo: boolean;
  fechaCreacion: string;
}

export interface GuardiasPaginados {
  items: GuardiaResumen[];
  total: number;
}

export interface GuardiaUpdateDto {
  numeroEmpleado?: string | null;
  turno?: string | null;
}

// ── Catálogos administrativos ─────────────────────────────────────
export interface CatalogoItem {
  id: number;
  nombre: string;
  activo: boolean;
}

export interface CatalogoCreateDto {
  nombre: string;
}

// ── Respuesta paginada de historial ────────────────────────────────
export interface HistorialPaginado {
  items: HistorialAccesoItemDto[];
  total: number;
  pagina: number;
  porPagina: number;
}