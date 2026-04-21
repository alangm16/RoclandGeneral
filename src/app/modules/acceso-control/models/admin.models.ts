// src/app/modules/acceso-control/models/admin.models.ts

export interface DashboardKpis {
  dentroAhora: number | null;
  totalHoy: number | null;
  totalVisitantesHoy: number | null;
  totalProveedoresHoy: number | null;
  promedioEstanciaMinutos: number | null;
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