// ==================== Comunes ====================
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  errors: string[];
}

export interface PagedResult<T> {
  items: T[];
  totalRegistros: number;
  paginaActual: number;
  registrosPorPagina: number;
  totalPaginas: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ==================== Puntos del catálogo ====================
export interface PuntoDto {
  id: number;
  categoria: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
}

// ==================== Checklist (Rondines) ====================
export interface ChecklistPuntoItemDto {
  idPunto: number;
  estado: boolean;   // true = OK, false = Problema
}

export interface GuardarChecklistDto {
  tipoRondin: string;   // "AMS" | "BME" | "AVS" | "BVE"
  observacion?: string | null;
  firma?: Uint8Array | null;   // bytes de la firma
  puntos: ChecklistPuntoItemDto[];
}

export interface GuardarChecklistResponseDto {
  idChecklist: number;
  incidenciasGeneradas: number;
}

export interface ChecklistResumenDto {
  id: number;
  fechaHoraLocal: string;      // ISO string
  tipoRondin: string;
  descripcionRondin: string;
  idGuardia: number;
  guardia: string;
  todoOk: boolean;
  tieneFirma: boolean;
}

export interface ChecklistPuntoDetalleDto {
  idPunto: number;
  categoria: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
  estado: boolean;
}

export interface ChecklistDetalleDto {
  id: number;
  fechaHoraLocal: string;
  tipoRondin: string;
  descripcionRondin: string;
  idGuardia: number;
  guardia: string;
  observacion: string | null;
  tieneFirma: boolean;
  firma?: string | null;
  puntos: ChecklistPuntoDetalleDto[];

}

// ==================== Incidencias ====================
export interface IncidenciaDto {
  id: number;
  fechaDeteccionLocal: string;
  idChecklistSaliente: number;
  tipoRondinSaliente: string;
  guardiaSaliente: string;
  fechaSaliente: string;
  idChecklistEntrante: number;
  tipoRondinEntrante: string;
  guardiaEntrante: string;
  fechaEntrante: string;
  idPunto: number;
  categoria: string;
  punto: string;
  descripcionPunto: string | null;
  resuelta: boolean;
  fechaResolucionLocal: string | null;
}

// ==================== Fotos ====================
export interface AgregarFotoDto {
  idChecklist: number;
  foto: Uint8Array;
  mimeType: string;   // ej. "image/jpeg"
}

// ==================== Dashboard ====================
export interface DashboardResumenDto {
  totalChecklistsHoy: number;
  totalIncidenciasAbiertas: number;
  totalIncidenciasResueltas: number;
  totalChecklistsSalientes: number;   // AMS + AVS
  totalChecklistsEntrantes: number;   // BME + BVE
  porcentajeIncidenciasResueltas: number; // 0-100
}

export interface ChecklistsPorDiaDto {
  fecha: string;   // YYYY-MM-DD
  cantidad: number;
}

export interface IncidenciasPorDiaDto {
  fecha: string;
  creadas: number;
  resueltas: number;
}

// ==================== Estado del día (para app móvil) ====================
export interface EstadoRondinDto {
  tipoRondin: string;     // "AMS" | "BME" | "AVS" | "BVE"
  existe: boolean;
  idChecklist: number | null;
  idGuardiaQueLo: number | null;
  yoLoHice: boolean;
}

export interface EstadoDiaDto {
  rondines: EstadoRondinDto[];
}