// ==================== Comunes ====================
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  errors: string[];
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface AuditableDto {
  id: number;
  activo: boolean;
  fechaCreacion: string;
  creadoPor: number | null;
  fechaModificacion: string | null;
  modificadoPor: number | null;
}

// ==================== Perfil / Usuarios ====================
export interface PerfilResponse extends AuditableDto {
  superAdminUsuarioId: number;
  nombreCompleto: string;
  numeroEmpleado: string | null;
  turno: string | null;   // "Diurno" | "Nocturno" | "Mixto"
}

export interface PerfilSummary {
  id: number;
  nombreCompleto: string;
  numeroEmpleado: string | null;
  turno: string | null;
  activo: boolean;
}

export interface CrearPerfilRequest {
  superAdminUsuarioId: number;
  nombreCompleto: string;
  numeroEmpleado?: string | null;
  turno?: string | null;
}

export interface ActualizarPerfilRequest {
  nombreCompleto: string;
  numeroEmpleado?: string | null;
  turno?: string | null;
}

// Usuario asignado desde SuperAdmin (para buscar y asignar)
export interface UsuarioSuperAdminAsignadoDto {
  superAdminUsuarioId: number;
  nombreCompleto: string;
  username: string;
  email: string;
  rolProyecto: string;      // "Guardia" | "Supervisor" | "Gerente"
  tienePerfilLocal: boolean;
  perfilLocalId: number | null;
}

// ==================== Configuración de Turnos ====================
export interface ConfigTurnoResponse extends AuditableDto {
  nombre: string;
  horaInicioSaliente: string;        // "HH:MM:SS"
  horaFinSaliente: string;
  horaInicioEntrante: string;
  horaFinEntrante: string;
  // Horarios de prueba (null = no aplica)
  horaInicioSalientePrueba: string | null;
  horaFinSalientePrueba: string | null;
  horaInicioEntrantePrueba: string | null;
  horaFinEntrantePrueba: string | null;
}

export interface ConfigTurnoSummary {
  id: number;
  nombre: string;
  activo: boolean;
  horaInicioSaliente: string;
  horaFinSaliente: string;
  horaInicioEntrante: string;
  horaFinEntrante: string;
  horaInicioSalientePrueba: string | null;
  horaFinSalientePrueba: string | null;
  horaInicioEntrantePrueba: string | null;
  horaFinEntrantePrueba: string | null;
}

export interface CrearConfigTurnoRequest {
  nombre: string;
  horaInicioSaliente: string;
  horaFinSaliente: string;
  horaInicioEntrante: string;
  horaFinEntrante: string;
}

export interface ActualizarConfigTurnoRequest extends CrearConfigTurnoRequest { }

// ==================== Asignación Base ====================
export interface AsignacionBaseResponse {
  id: number;
  configTurnoId: number;
  rol: string;          // "Saliente" | "Entrante"
  perfilId: number;
  fechaVigenciaDesde: string;   // YYYY-MM-DD
  fechaVigenciaHasta: string | null;
  activo: boolean;
  fechaCreacion: string;
  creadoPor: number | null;
}

export interface AsignacionBaseSummary {
  id: number;
  turnoNombre: string;
  rol: string;
  guardiaNombre: string;
  guardiaNumeroEmpleado: string | null;
  fechaVigenciaDesde: string;
  fechaVigenciaHasta: string | null;
  activo: boolean;
}

export interface CrearAsignacionBaseRequest {
  configTurnoId: number;
  rol: string;
  perfilId: number;
  fechaVigenciaDesde: string;
  fechaVigenciaHasta?: string | null;
}

export interface ActualizarAsignacionBaseRequest extends CrearAsignacionBaseRequest {
  activo: boolean;
}

// ==================== Checklist ====================
export interface ChecklistPuntoResponse extends AuditableDto {
  categoria: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
}

export interface ChecklistPuntoItem {
  id: number;
  nombre: string;
  descripcion: string | null;
  orden: number;
}

export interface ChecklistPuntosPorCategoriaResponse {
  categoria: string;
  puntos: ChecklistPuntoItem[];
}

export interface CrearChecklistPuntoRequest {
  categoria: string;
  nombre: string;
  descripcion?: string | null;
  orden: number;
}

export interface ActualizarChecklistPuntoRequest extends CrearChecklistPuntoRequest {
  activo: boolean;
}

export interface ReordenarChecklistPuntosRequest {
  items: { id: number; orden: number }[];
}

// ==================== Respuestas del Checklist ====================
export interface ChecklistRespuestaResponse {
  id: number;
  participanteId: number;
  puntoId: number;
  nombrePunto: string;
  categoriaPunto: string;
  respuesta: boolean;   // true = OK, false = No OK
  comentario: string | null;
  fechaRespuesta: string;
}

export interface GuardarRespuestaRequest {
  puntoId: number;
  respuesta: boolean;
  comentario?: string | null;
}

export interface GuardarRespuestasBatchRequest {
  respuestas: GuardarRespuestaRequest[];
}

// Discrepancias (comparativa saliente/entrante)
export interface DiscrepanciaRespuestaResponse {
  puntoId: number;
  nombrePunto: string;
  categoriaPunto: string;
  respuestaSaliente: boolean | null;
  comentarioSaliente: string | null;
  respuestaEntrante: boolean | null;
  comentarioEntrante: string | null;
  esDiscrepancia: boolean;
}

export interface DiscrepanciaResumenResponse {
  relevoId: number;
  fecha: string;
  turno: string;
  categoria: string;
  punto: string;
  respSaliente: boolean;
  comentSaliente: string | null;
  respEntrante: boolean;
  comentEntrante: string | null;
  tipoOrigen: string;
  estadoIncidencia: string;
  incidenciaId: number | null;
}

// ==================== Participante (dentro de Relevo) ====================
export interface ParticipanteResponse extends AuditableDto {
  relevoId: number;
  perfilId: number;
  nombreGuardia: string;
  numeroEmpleado: string | null;
  rol: string;           // "Saliente" | "Entrante"
  estado: string;        // "Pendiente" | "EnCurso" | "Completado" | "Expirado"
  fechaInicio: string | null;
  fechaFin: string | null;
  firmaBase64: string | null;
  observaciones: string | null;
  respuestas: ChecklistRespuestaResponse[];
}

export interface ParticipanteSummary {
  id: number;
  perfilId: number;
  nombreGuardia: string;
  rol: string;
  estado: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  totalOk: number;
  totalNoOk: number;
}

export interface AsignarParticipanteRequest {
  relevoId: number;
  perfilId: number;
  rol: string;
}

// ==================== Incidencias ====================
export interface IncidenciaResponse extends AuditableDto {
  relevoId: number;
  fechaRelevo: string;
  puntoId: number;
  nombrePunto: string;
  categoriaPunto: string;
  tipoOrigen: string;      // "NoOk" | "Discrepancia"
  descripcion: string | null;
  fotoBase64: string | null;
  mimeType: string | null;
  estado: string;          // "Abierta" | "Resuelta"
  resueltaPorId: number | null;
  resueltaPorNombre: string | null;
  fechaResolucion: string | null;
  notaResolucion: string | null;
}

export interface IncidenciaListResponse {
  id: number;
  relevoId: number;
  fechaRelevo: string;
  nombrePunto: string;
  categoriaPunto: string;
  tipoOrigen: string;
  estado: string;
  tieneFoto: boolean;
  fechaCreacion: string;
}

export interface CrearIncidenciaRequest {
  relevoId: number;
  puntoId: number;
  tipoOrigen: string;
  descripcion?: string | null;
  fotoBase64?: string | null;
  mimeType?: string | null;
}

export interface ActualizarIncidenciaRequest {
  descripcion?: string | null;
  fotoBase64?: string | null;
  mimeType?: string | null;
}

export interface ResolverIncidenciaRequest {
  resueltaPorId: number;
  notaResolucion: string;
}

export interface FiltrarIncidenciasRequest {
  relevoId?: number;
  puntoId?: number;
  tipoOrigen?: string;
  estado?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  page?: number;
  pageSize?: number;
}

// ==================== Relevos ====================
export interface RelevoDetalleResponse extends AuditableDto {
  configTurnoId: number;
  nombreTurno: string;
  fecha: string;
  estado: string;          // "Pendiente" | "EnCurso" | "Completado" | "Incompleto"
  saliente: ParticipanteResponse | null;
  entrante: ParticipanteResponse | null;
  incidencias: IncidenciaResponse[];
}

export interface RelevoListResponse {
  id: number;
  fecha: string;
  nombreTurno: string;
  estado: string;
  nombreSaliente: string | null;
  nombreEntrante: string | null;
  totalIncidenciasAbiertas: number;
  totalIncidenciasResueltas: number;
}

export interface RelevoHoyResponse {
  relevoId: number;
  fecha: string;
  nombreTurno: string;
  estado: string;
  horaInicioSaliente: string;
  horaFinSaliente: string;
  horaInicioEntrante: string;
  horaFinEntrante: string;
  saliente: ParticipanteSummary | null;
  entrante: ParticipanteSummary | null;
}

export interface RelevoActivoGuardiaResponse {
  relevo: RelevoHoyResponse;
  participanteId: number;
  rol: string;
  estadoParticipante: string;
  ventanaInicio: string;
  ventanaFin: string;
  estaDentroVentana: boolean;
  puedeIniciar: boolean;
  puedeCerrar: boolean;
}

export interface CrearRelevoRequest {
  configTurnoId: number;
  fecha: string;
}

export interface ActualizarEstadoRelevoRequest {
  estado: string;
}

export interface FiltrarRelevosRequest {
  fechaDesde?: string;
  fechaHasta?: string;
  configTurnoId?: number;
  estado?: string;
  page?: number;
  pageSize?: number;
}

// ==================== Configuración de la App ====================
export interface ConfiguracionAppResponse {
  id: number;
  zonaHoraria: string;
  offsetUTCMinutos: number;
  modoActivo: string;          // "Produccion" | "Prueba"
  soloLunesViernes: boolean;
  guardiaA_PerfilId: number | null;
  guardiaA_Nombre: string | null;
  guardiaB_PerfilId: number | null;
  guardiaB_Nombre: string | null;
  fechaModificacion: string;
  modificadoPor: number | null;
}

export interface UpdateConfiguracionAppRequest {
  zonaHoraria?: string;
  offsetUTCMinutos?: number;
  modoActivo?: string;
  soloLunesViernes?: boolean;
  guardiaA_PerfilId?: number | null;
  guardiaB_PerfilId?: number | null;
}

export interface InfoModoResponse {
  horaUTC: string;
  horaLocalTorreon: string;
  offsetUTCMinutos: number;
  modoActivo: string;
  soloLunesViernes: boolean;
  guardiaA_Nombre: string;
  guardiaB_Nombre: string;
  turnos: TurnoInfoModo[];
}

export interface TurnoInfoModo {
  nombre: string;
  prodSalInicio: string;
  prodSalFin: string;
  prodEntInicio: string;
  prodEntFin: string;
  pruebaSalInicio: string | null;
  pruebaSalFin: string | null;
  pruebaEntInicio: string | null;
  pruebaEntFin: string | null;
}

// ==================== Generación automática ====================
export interface GeneracionDtos {
  fechaProcesada: string;
  esDiaHabil: boolean;
  modo: string;
  relevosCreados: number;
  mensajes: string[];
  omitidoPorFinDeSemana: boolean;
}

// ==================== Rondín (App móvil) ====================
export interface IniciarRondinResponse {
  exito: boolean;
  codigoRetorno: number;
  mensaje: string;
  participanteId: number | null;
  relevoId: number | null;
  configTurnoId: number | null;
  rol: string | null;
}

export interface GuardarRespuestaResponse {
  exito: boolean;
  codigoRetorno: number;
  mensaje: string;
  respuestaId: number | null;
}

export interface CompletarRondinResponse {
  exito: boolean;
  codigoRetorno: number;
  mensaje: string;
  relevoCompletado: boolean;
  incidenciasGeneradas: number | null;
}

// ==================== Perfil contexto (autenticación) ====================
export interface PerfilContextoDto {
  perfilId: number;
  superAdminUsuarioId: number;
  nombreCompleto: string;
  nombreRol: string;
  nivelRol: number;
  turno: string | null;
  numeroEmpleado: string | null;
}

// ==================== Participante (requests) ====================
export interface IniciarParticipanteRequest {
  observaciones?: string | null;
}

export interface CerrarParticipanteRequest {
  observaciones?: string | null;
  firmaBase64: string;
  respuestas: GuardarRespuestaRequest[];   // reutiliza el existente
}