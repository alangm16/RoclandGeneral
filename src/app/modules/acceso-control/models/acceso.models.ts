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