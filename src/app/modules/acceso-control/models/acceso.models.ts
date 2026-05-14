// acceso.models.ts
// Modelos alineados con Acceso Control v5.2

// ── Catálogos públicos (solo id/nombre) ─────────────────────────
export interface TipoIdentificacion {
  id: number;
  nombre: string;
}

export interface Area {
  id: number;
  nombre: string;
}

export interface MotivoVisita {
  id: number;
  nombre: string;
}

// ── Autocompletado (GET /api/web/accesocontrol/personas/buscar) ─
export interface PersonaAutocompletado {
  id: number;
  nombre: string;
  tipoId: string;
  tipoIdentificacionId: number;
  numeroIdentificacion: string;
  empresa?: string;
  telefono?: string;
  email?: string;
  totalVisitas: number;
  fechaUltimaVisita?: string;
}

// ── Visitante ─────────────────────────────────────────────────────
export interface CrearVisitanteRequest {
  nombre: string;
  tipoIdentificacionId: number;
  numeroIdentificacion: string;
  telefono?: string;
  email?: string;
  areaId: number;
  motivoId: number;
  consentimientoFirmado: boolean;
  observaciones?: string;
}

export interface VisitanteResponse {
  registroId: number;
  personaId: number;
  nombre: string;
  area: string;
  motivo: string;
  estadoAcceso: string;
  fechaEntrada: string;
  esRecurrente: boolean;
  totalVisitasPrevias: number;
}

// ── Proveedor ─────────────────────────────────────────────────────
export interface CrearProveedorRequest {
  nombre: string;
  tipoIdentificacionId: number;
  numeroIdentificacion: string;
  empresa: string;
  telefono?: string;
  email?: string;
  motivoId: number;
  unidadPlacas?: string;
  facturaRemision?: string;
  consentimientoFirmado: boolean;
  observaciones?: string;
}

export interface ProveedorResponse {
  registroId: number;
  personaId: number;
  nombre: string;
  empresa: string;
  motivo: string;
  estadoAcceso: string;
  fechaEntrada: string;
  esRecurrente: boolean;
  totalVisitasPrevias: number;
}

export interface DatosConfirmacion {
  nombre: string;
  tipo: string;
  id: number;
  hora: string;
}