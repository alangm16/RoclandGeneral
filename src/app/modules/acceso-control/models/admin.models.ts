// src/app/modules/acceso-control/models/admin.models.ts

export interface DashboardKpis {
  dentroAhora: number | null;
  accesosHoy: number | null;
  visitantesHoy: number | null;
  proveedoresHoy: number | null;
  tiempoPromedio: number | null;
  solicitudesPendientes: number | null;
}

export interface ActivoZona {
  tipoRegistro: 'Visitante' | 'Proveedor';
  nombrePersona: string;
  empresa?: string;
  area?: string;
  fechaEntrada: string; // ISO String
  numeroGafete?: string;
}

export interface FlujoHora {
  hora: number;
  total: number;
}

export interface AreaRanking {
  area: string;
  total: number;
}

export interface FlujoDiario {
  fecha: string;
  visitantes: number;
  proveedores: number;
}

export interface PersonaResumen {
  id: number;
  nombre: string;
  numeroIdentificacion: string;
  tipoID: string;
  empresa?: string;
  totalVisitas: number;
  fechaUltimaVisita?: string;
}

export interface PersonaPerfil extends PersonaResumen {
  telefono?: string;
  fechaRegistro: string;
}

export interface HistorialPersonaItem {
  tipo: string;
  area?: string;
  empresa?: string;
  motivo: string;
  fechaEntrada: string;
  fechaSalida?: string;
  minutosEstancia?: number;
  estadoAcceso: string;
}

export interface PersonasPaginadas {
  items: PersonaResumen[];
  total: number;
}

export interface GuardiaResumen {
  id: number;
  nombre: string;
  usuario: string;
  rol: string;
  activo: boolean;
  fechaCreacion: string;
}

export interface GuardiaCreateDto {
  nombre: string;
  usuario: string;
  password: string;
}

export interface GuardiaUpdateDto {
  nombre: string;
  activo: boolean;
}

export interface GuardiasPaginados {
  items: GuardiaResumen[];
  total: number;
}

export interface HistorialAccesoDto {
  items: HistorialResumen[];
  total: number;
}

export interface HistorialResumen {
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
  guardia?: string;
}

export interface CatalogoItem {
  id: number;
  nombre: string;
  activo: boolean;
}

export interface CatalogoCreateDto {
  nombre: string
}