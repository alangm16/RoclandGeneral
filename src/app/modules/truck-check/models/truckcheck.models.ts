export interface ResultadoPaginado<T> {
    items: T[];
    totalRegistros: number;
    paginaActual: number;
    registrosPorPagina: number;
    totalPaginas: number;
    tienePaginaAnterior: boolean;
    tienePaginaSiguiente: boolean;
}

// Views

export interface TruckPuedeEntrar {
    id: number;
    placas: string;
    ultimoKilometraje: number;
}

export interface TruckPuedeSalir {
    id: number;
    placas: string;
    ultimoKilometraje: number;
}

export interface TruckChecklist {
    id: number;
    fechaHoraLocal: string;
    tipoRegistro: string;
    idSucursal: number;
    sucursal: string;
    idVehiculo: number;
    placas: string;
    candados: boolean;
    licencia: boolean;
    sinDaniosNuevos: boolean;
    llantasBienEstado: boolean;
    lucesFuncionando: boolean;
    sinFugasVisibles: boolean;
    kilometraje: number;
    nivelCombustible: number;
    nombreChofer: string;
    idGuardia: number;
    guardia: string;
    observacion: string;
    fechaUltimaSalida?: string;
    minutosAfuera?: number;
    fechaCreacion: string;
}

export interface TruckAlertaKmAnomalo {
    IdVehiculo: number;
    Placas: string;
    Marca?: string;
    Modelo?: string;

    IdSalida: number;
    FechaSalida: string;
    FechaEntrada: string;
    KmRecorridos: number;

    NombreChofer: string;
    SucursalOrigen?: string;
    SucursalDestino?: string;

    PromKmHistorico: number;
    DesvEstKm: number;
    TotalViajes: number;

    Zscore: number;
    UmbralAlerta: number;
}

export interface TruckAlertaMantenimiento {
    IdPrograma: number;
    IdVehiculo: number;
    Placas: string;
    Marca?: string;
    Modelo?: string;
    UltimoKilometraje: number;
    TipoMantenimiento: string;
    IntervaloKm?: number;
    IntervaloDias?: number;

    FechaUltimoServicio?: string;
    KmUltimoServicio?: number;
    
    KmProximoServicio?: number;
    FechaProximoServicio?: string;

    KmRestantes?: number;
    DiasRestantes?: number;

    Estado: string;
    PrioridadAlerta: number;
}

export interface TruckRendimiento {
    IdVehiculo: number;
    Placas: string;
    Marca?: string;
    Modelo?: string;

    TotalViajes: number;
    KmTotales?: number;

    PromKmPorViaje?: number;
    PromLitrosPorViaje?: number;
    PromLmPorLitro?: number;

    PeorRendimiento?: number;
    MejorRendimiento?: number;

    PromDuracionMinutos?: number;
}

export interface TruckViajeDto {
    IdVehiculo : number;
    Placas: string;
    Marca?: string;
    Modelo?: string;
    CapacidadTanque: number;
    IdSalida: number;
    FechaSalida: string;
    KmSalida: number;
    NivelSalida: number;
    IdSucursalOrigen: number;
    SucursalOrigen?: string;
    NombreChofer?: string;
    IdEntrada: number;
    FechaEntrada: string;
    KmEntrada: number;
    NivelEntrada: number;
    IdSucursalDestino: number;
    SucursalDestino?: string;

    DuracionMinutos: number;
    KmRecorridos?: number;
    LitrosConsumidos?: number;
    KmPorLitro?: number;
}

// ChecklistDaniosDtos

export interface ChecklistDanioResponse {
    id: number;
    idChecklist: number;
    idZonaDanio: number;
    nombreZona: string;
    notas?: string;
}

// ChecklistDtos

export interface ChecklistHistorialResponse {
    id: number;
    fechaHoraLocal: string;
    tipoRegistro: string;
    sucursal: string;
    placas: string;
    nombreChofer: string;
    guardia: string;
}

export interface ChecklistDetalleResponse {
    id: number;
    fechaHoraLocal: string;
    tipoRegistro: string;
    sucursal: string;
    placas: string;
    nombreChofer: string;
    guardia: string;
    candados: boolean;
    licencia: boolean;
    sinDaniosNuevos: boolean;
    llantasBienEstado: boolean;
    lucesFuncionando: boolean;
    sinFugasVisibles: boolean;
    kilometraje: number;
    nivelCombustible: number;
    observacion?: string;
    fechaCreacion: string | null;
    daniosReportados?: ChecklistDanioResponse[];
}

export interface FiltroChecklistRequest {
    fechaInicio?: string;
    fechaFin?: string;
    tipoRegistro?: string;
    idSucursal?: number;
    placasVehiculo?: string;   
    nombreChofer?: string;
    idGuardia?: number;
    idVehiculo?: number;
    idChofer?: number;
    pagina: number;
    registrosPorPagina: number;    
}
export interface CatalogosMobileResponse {
    vehiculos: VehiculoResponse[];
    sucursales: SucursalResponse[];
    choferes: ChoferResponse[];
    zonasDanio: ZonaResponse[];
}

// ChoferDtos

export interface CrearChoferRequest {
    nombre: string;
}

export interface CrearChoferResponse {
    id: number;
    mensaje: string;
}

export interface ActualizarChoferRequest {
    id: number;
    nombre: string;
    activo: boolean;
}

export interface ActualizarEstadoChoferRequest {
    id: number;
    activo: boolean;
}

export interface ChoferResponse {
    id: number;
    nombre: string;
    activo: boolean;
}

// Dashboard

export interface KpiCamionesAfuera {
    totalCamionesAfuera: number;
}

export interface KpiSalidasHoy {
    totalSalidasHoy: number;
}

export interface KpiPromedioMinutosFuera {
    promedioMinutosFuera: number;
}

export interface CamionAfuera {
    placas: string;
    nombreChofer: string;
    minutosFuera: number;
    sucursalDestino: string;
    fechaSalida: string;
    ultimoKilometraje: number;
    nivelCombustible: number;
}

export interface CamionDentro {
    placas: string;
    nombreChofer: string;
    minutosDentro: number;
    sucursalOrigen: string;
    fechaEntrada: string;
    ultimoKilometraje: number;
    nivelCombustible: number;
}

export interface SucursalFrecuencia {
    sucursal: string;
    totalVisitas: number;
}

export interface VehiculoFrecuencia {
    placas: string;
    totalSalidas: number;
}

export interface FlujoHorario {
    hora: number;
    entradas: number;
    salidas: number;
}

export interface FlujoMensual {
    anio: number;
    mes: number;
    entradas: number;
    salidas: number;
}

export interface ViajesCamionMensual {
    placas: string;
    totalViajes: number;
    totalHorasFuera: number;
}

export interface DashboardResume {
    kpiCamionesAfuera: KpiCamionesAfuera;
    kpiSalidasHoy: KpiSalidasHoy;
    kpiPromedioMinutosFuera: KpiPromedioMinutosFuera;
    camionesAfuera: CamionAfuera[];
    camionesDentro?: CamionDentro[];
    sucursalesMasVisitadas: SucursalFrecuencia[];
    camionesMasActivos: VehiculoFrecuencia[];
    flujoPorHora: FlujoHorario[];
    flujoMensual: FlujoMensual[];
}

// Mantenimiento

export interface CrearTipoMantenimiento {
    nombre: string;
}

export interface ActualizarTipoMantenimiento {
    Nombre: string;
    Activo: boolean;
}

export interface CrearProgramaMantenimiento {
    IdVehiculo: number;
    IdTipoMantenimiento: number;
    IntervaloKm?: number;
    IntervaloDias?: number;
}

export interface ActualizarProgramaMantenimiento {
    IntervaloKm?: number | null;
    IntervaloDias: number | null;
    Activo: boolean;
}

export interface CrearMantenimiento {
    IdVehiculo: number;
    IdTipoMantenimiento: number;
    FechaRealizacion: string;
    kmAlMomento: number;
    Costo?: number;
    Taller?: string;
    Observaciones?: string;
}

export interface ActualizarMantenimiento {
    FechaRealizacion: string;
    KmAlMomento: number;
    Costo?: number;
    Taller?: string;
    Observaciones?: string;
}

export interface FiltroHistorialMantenimiento {
    IdVehiculo?: number;
    TipoMantenimiento?: number;
    FechaDesde?: string;
    FechaHasta?: string;
    Taller?: string;
}

export interface TipoMantenimiento {
    id: number;
    nombre: string;
    activo: boolean;
}

export interface ProgramaMantenimiento {
    Id: number;
    IdVehiculo: number;
    Placas: string;
    IdTipoMantenimiento: number;
    TipoMantenimiento: string;
    IntervaloKm?: number;
    IntervaloDias?: number;
    Activo: boolean;
}

export interface Mantenimiento {
    id: number;
    idVehiculo: number;
    placas: string;
    idTipoMantenimiento: number;
    tipoMantenimiento: string;
    fechaRealizacion: string;
    kmAlMomento: number;
    costo?: number;
    taller?: string;
    observaciones?: string;
    idSupervisor: number;
    nombreSupervisor: string;
    fechaCreacion: string;
}

// Sucursal

export interface CrearSucursalRequest {
    nombre: string;
}

export interface CrearSucursalResponse {
    id: number;
    mensaje: string;
}

export interface ActualizarSucursalRequest {
    id: number;
    nombre: string;
    activo: boolean;
}

export interface ActualizarEstadoSucursalRequest {
    id: number;
    activo: boolean;
}

export interface SucursalResponse {
    id: number;
    nombre: String;
    activo: boolean;
}

// VehiculosDtos

export interface CrearVehiculoRequest {
    placas: string;
}

export interface CrearVehiculoResponse {
    id: number;
    mensaje: string;
}

export interface ActualizarVehiculoRequest {
    id: number;
    placas: string;
    activo: boolean;
}

export interface ActualizarEstadoVehiculoRequest {
    id: number;
    activo: boolean;
}

export interface VehiculoResponse {
    id: number;
    placas: string;
    marca?: string;
    modelo?: string;
    activo: boolean;
}

// ZonasDanio

export interface CrearZonaRequest {
    nombre: string;
}

export interface ActualizarZonaRequest {
    id: number;
    nombre: string;
    activo: boolean;
}

export interface ActualizarEstadoZonaRequest {
    id: number;
    activo: boolean;
}

export interface ZonaResponse {
    id: number;
    nombre: String;
    activo: boolean;
}

// Catalogos

export interface CatalogosResponse {
    vehiculos: VehiculoResponse[];
    sucursales: SucursalResponse[];
    choferes: ChoferResponse[];
    zonasDanio: ZonaResponse[];
}