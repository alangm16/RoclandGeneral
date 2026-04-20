// acceso.models.ts
// Rocland — Módulo Acceso Control
// Interfaces TypeScript que espejean exactamente los DTOs y Entities del backend.
// Sprint 2 — Conexión API

// ── Catálogos ─────────────────────────────────────────────────────
export interface TipoIdentificacion {
  id:     number;
  nombre: string;
  activo: boolean;
}

export interface Area {
  id:     number;
  nombre: string;
  activo: boolean;
}

export interface MotivoVisita {
  id:     number;
  nombre: string;
  activo: boolean;
}

// ── Autocompletado (GET /api/personas/buscar?numId=xxx) ───────────
export interface PersonaAutocompletado {
  nombre:       string;
  empresa?:     string;
  telefono?:    string;
  email?:       string;
  totalVisitas: number;
}

// ── Visitante ─────────────────────────────────────────────────────
// Espeja: CrearVisitanteRequest (VisitanteDTOs.cs)
export interface CrearVisitanteRequest {
  nombre:               string;
  tipoIdentificacionId: number;
  numeroIdentificacion: string;
  empresa?:             string | null;
  telefono?:            string | null;
  email?:               string | null;
  areaId:               number;
  motivoId:             number;
  consentimientoFirmado: boolean;
  observaciones?:       string | null;
}

// Espeja: VisitanteResponse (VisitanteDTOs.cs)
export interface VisitanteResponse {
  registroId:        number;
  personaId:         number;
  nombre:            string;
  area:              string;
  motivo:            string;
  estadoAcceso:      string;
  fechaEntrada:      string; // ISO string — se parsea con new Date()
  esRecurrente:      boolean;
  totalVisitasPrevias: number;
}

// ── Proveedor ─────────────────────────────────────────────────────
// Espeja: CrearProveedorRequest (ProveedorDTOs.cs)
export interface CrearProveedorRequest {
  nombre:               string;
  tipoIdentificacionId: number;
  numeroIdentificacion: string;
  empresa:              string;
  telefono?:            string | null;
  email?:               string | null;
  motivoId:             number;
  unidadPlacas?:        string | null;
  facturaRemision?:     string | null;
  consentimientoFirmado: boolean;
  observaciones?:       string | null;
}

// Espeja: ProveedorResponse (ProveedorDTOs.cs)
export interface ProveedorResponse {
  registroId:          number;
  personaId:           number;
  nombre:              string;
  empresa:             string;
  motivo:              string;
  estadoAcceso:        string;
  fechaEntrada:        string;
  esRecurrente:        boolean;
  totalVisitasPrevias: number;
}

// ── Confirmación (contrato sessionStorage) ────────────────────────
// Mismo contrato que usaban visitante-form.js y proveedor-form.js originales
export interface DatosConfirmacion {
  nombre: string;
  tipo:   string;  // 'Visitante' | 'Proveedor / Cliente'
  id:     number;
  hora:   string;
}