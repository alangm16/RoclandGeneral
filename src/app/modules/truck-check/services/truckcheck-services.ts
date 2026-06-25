import { HttpClient, HttpParams } from '@angular/common/http'
import { Observable } from 'rxjs'
import { environment } from '../../../../environments/Environment'
import { Injectable, inject } from '@angular/core'
import {
    ResultadoPaginado,
    TruckPuedeEntrar,
    TruckPuedeSalir,
    DashboardResume,
    KpiCamionesAfuera,
    KpiSalidasHoy,
    KpiPromedioMinutosFuera,
    CamionAfuera,
    CamionDentro,
    SucursalFrecuencia,
    VehiculoFrecuencia,
    FlujoHorario,
    FlujoMensual,
    ChecklistHistorialResponse,
    FiltroChecklistRequest,
    ChecklistDetalleResponse,
    ChoferResponse,
    CrearChoferRequest,
    CrearChoferResponse,
    ActualizarChoferRequest,
    ActualizarEstadoChoferRequest,
    SucursalResponse,
    CrearSucursalRequest,
    CrearSucursalResponse,
    ActualizarSucursalRequest,
    ActualizarEstadoSucursalRequest,
    VehiculoResponse,
    CrearVehiculoRequest,
    CrearVehiculoResponse,
    ActualizarVehiculoRequest,
    ActualizarEstadoVehiculoRequest,
    CatalogosResponse,
    ViajesCamionMensual,
    TipoMantenimiento,
    ProgramaMantenimiento,
    Mantenimiento,
    TruckViajeDto,
    TruckRendimiento,
    TruckAlertaMantenimiento,
    TruckAlertaKmAnomalo,
    CrearMantenimiento,
    CrearProgramaMantenimiento,
    CrearTipoMantenimiento,
    ActualizarMantenimiento,
    ActualizarProgramaMantenimiento,
    ActualizarTipoMantenimiento,
    FiltroHistorialMantenimiento
}  from '../models/truckcheck.models';

@Injectable({ providedIn: 'root'})
export class TruckCheckService {
    private readonly http = inject(HttpClient);
    private readonly base = `${environment.apiUrl}/api/web/truckcheck`;
    
    // ===================== DASHBOARD =====================
    getDashboardResumen(): Observable<DashboardResume> {
        return this.http.get<DashboardResume>(`${this.base}/dashboard/resumen`);
    }

    getKpiCamionesAfuera(): Observable<KpiCamionesAfuera> {
        return this.http.get<KpiCamionesAfuera>(`${this.base}/dashboard/kpi/camiones-afuera`);
    }

    getKpiSalidasHoy(): Observable<KpiSalidasHoy> {
        return this.http.get<KpiSalidasHoy>(`${this.base}/dashboard/kpi/salidas-hoy`);
    }

    getKpiPromedioMinutosFuera(): Observable<KpiPromedioMinutosFuera> {
        return this.http.get<KpiPromedioMinutosFuera>(`${this.base}/dashboard/kpi/promedio-minutos-fuera`);
    }

    getCamionesAfuera(): Observable<CamionAfuera[]> {
        return this.http.get<CamionAfuera[]>(`${this.base}/dashboard/camiones-afuera`);
    }

    getCamionesDentro(): Observable<CamionDentro[]> {
        return this.http.get<CamionDentro[]>(`${this.base}/dashboard/camiones-dentro`);
    }

    getSucursalesMasVisitadas(top: number = 5): Observable<SucursalFrecuencia[]> {
        return this.http.get<SucursalFrecuencia[]>(`${this.base}/dashboard/sucursales-mas-visitadas?top=${top}`);
    }

    getVehiculosMasActivos(top: number = 5): Observable<VehiculoFrecuencia[]> {
        return this.http.get<VehiculoFrecuencia[]>(`${this.base}/dashboard/vehiculos-mas-activos?top=${top}`);
    }

    getFlujoPorHora(fecha?: string): Observable<FlujoHorario[]> {
        let params = new HttpParams();
        if (fecha) params = params.set('fecha', fecha);
        return this.http.get<FlujoHorario[]>(`${this.base}/dashboard/flujo-por-hora`, { params });
    }

    getFlujoMensual(anio?: number): Observable<FlujoMensual[]> {
        let params = new HttpParams();
        if (anio) params = params.set('anio', anio.toString());
        return this.http.get<FlujoMensual[]>(`${this.base}/dashboard/flujo-mensual`, { params });
    }

    getViajesPorCamion(anio: number): Observable<ViajesCamionMensual[]> {
        return this.http.get<ViajesCamionMensual[]>(`${this.base}/dashboard/viajes-por-camion?anio=${anio}`);
    }

    getTrucksPuedenEntrar(): Observable<TruckPuedeEntrar[]> {
        return this.http.get<TruckPuedeEntrar[]>(`${this.base}/vehiculos/pueden-entrar`);
    }

    getTrucksPuedenSalir(): Observable<TruckPuedeSalir[]> {
        return this.http.get<TruckPuedeSalir[]>(`${this.base}/vehiculos/pueden-salir`);
    }
    
    // Services Checklist
    getChecklistHistorial( filtro: FiltroChecklistRequest ): Observable<ResultadoPaginado<ChecklistHistorialResponse>> {
        let params = new HttpParams()
            .set('Pagina', filtro.pagina.toString())
            .set('RegistrosPorPagina', filtro.registrosPorPagina.toString());

        if (filtro.fechaInicio) params = params.set('FechaInicio', filtro.fechaInicio);
        if (filtro.fechaFin) params = params.set('FechaFin', filtro.fechaFin);
        if (filtro.tipoRegistro) params = params.set('TipoRegistro', filtro.tipoRegistro);
        if (filtro.idSucursal) params = params.set('IdSucursal', filtro.idSucursal.toString());
        if (filtro.idVehiculo) params = params.set('IdVehiculo', filtro.idVehiculo.toString());
        if (filtro.idChofer) params = params.set('IdChofer', filtro.idChofer.toString());
        if (filtro.placasVehiculo) params = params.set('PlacasVehiculo', filtro.placasVehiculo);
        if (filtro.nombreChofer) params = params.set('NombreChofer', filtro.nombreChofer);
        if (filtro.idGuardia) params = params.set('IdGuardia', filtro.idGuardia.toString());

        return this.http.get<ResultadoPaginado<ChecklistHistorialResponse>>(
            `${this.base}/checklists`,
            { params }
        );
    }

    getChecklistDetallePorId(ChecklistId: number): Observable<ChecklistDetalleResponse> {
        return this.http.get<ChecklistDetalleResponse>(`${this.base}/checklists/${ChecklistId}`);
    }

    // Services Choferes

    getChoferes(): Observable<ChoferResponse[]> {
        return this.http.get<ChoferResponse[]>(`${this.base}/choferes`);
    }

    getChoferesPorId(choferId: number) : Observable<ChoferResponse> {
        return this.http.get<ChoferResponse>(`${this.base}/choferes/${choferId}`);
    }

    crearChofer(request: CrearChoferRequest): Observable<CrearChoferResponse> {
        return this.http.post<CrearChoferResponse>(`${this.base}/choferes`, request);
    }

    updateChofer(id:number, dto: ActualizarChoferRequest): Observable<void>{
        return this.http.put<void>(`${this.base}/choferes/${id}`, dto);
    }

    updateEstadoChofer(id: number, dto: ActualizarEstadoChoferRequest): Observable<void> {
        return this.http.patch<void>(`${this.base}/choferes/${id}/estado`, dto);
    }

    // Services Sucursales

    getSucursales(): Observable<SucursalResponse[]> {
        return this.http.get<SucursalResponse[]>(`${this.base}/sucursales`);
    }

    getSucursalesPorId(sucursalId: number) : Observable<SucursalResponse> {
        return this.http.get<SucursalResponse>(`${this.base}/sucursales/${sucursalId}`);
    }

    crearSucursal(request: CrearSucursalRequest): Observable<CrearSucursalResponse> {
        return this.http.post<CrearSucursalResponse>(`${this.base}/sucursales`, request);
    }

    updateSucursal(id:number, dto: ActualizarSucursalRequest): Observable<void>{
        return this.http.put<void>(`${this.base}/sucursales/${id}`, dto);
    }

    updateEstadoSucursal(id: number, dto: ActualizarEstadoSucursalRequest): Observable<void> {
        return this.http.patch<void>(`${this.base}/sucursales/${id}/estado`, dto);
    }

    // Servies Vehiculos

    getVehiculos(): Observable<VehiculoResponse[]> {
        return this.http.get<VehiculoResponse[]>(`${this.base}/vehiculos`);
    }

    getVehiculoPorId(vehiculoId: number) : Observable<VehiculoResponse> {
        return this.http.get<VehiculoResponse>(`${this.base}/vehiculos/${vehiculoId}`);
    }

    crearVehiculo(request: CrearVehiculoRequest): Observable<CrearVehiculoResponse> {
        return this.http.post<CrearVehiculoResponse>(`${this.base}/vehiculos`, request);
    }

    updateVehiculo(id:number, dto: ActualizarVehiculoRequest): Observable<void>{
        return this.http.put<void>(`${this.base}/vehiculos/${id}`, dto);
    }

    updateEstadoVehiculo(id: number, dto: ActualizarEstadoVehiculoRequest): Observable<void> {
        return this.http.patch<void>(`${this.base}/vehiculos/${id}/estado`, dto);
    }

    // Catalogos

    getCatalogos(): Observable<CatalogosResponse> {  
        return this.http.get<CatalogosResponse>(`${this.base}/checklists/catalogos`);  
    }

    // ── TIPOS DE MANTENIMIENTO ──

    getTiposMantenimiento(soloActivos: boolean = true): Observable<TipoMantenimiento[]> {
        let params = new HttpParams().set('soloActivos', soloActivos.toString());
        return this.http.get<TipoMantenimiento[]>(`${this.base}/mantenimiento/tipos`, { params });
    }

    getTipoMantenimientoById(id: number): Observable<TipoMantenimiento> {
        return this.http.get<TipoMantenimiento>(`${this.base}/mantenimiento/tipos/${id}`);
    }

    crearTipoMantenimiento(dto: CrearTipoMantenimiento): Observable<TipoMantenimiento> {
        return this.http.post<TipoMantenimiento>(`${this.base}/mantenimiento/tipos`, dto);
    }

    actualizarTipoMantenimiento(id: number, dto: ActualizarTipoMantenimiento): Observable<TipoMantenimiento> {
        return this.http.put<TipoMantenimiento>(`${this.base}/mantenimiento/tipos/${id}`, dto);
    }

    // ── PROGRAMAS DE MANTENIMIENTO ──

    getProgramasMantenimiento(soloActivos: boolean = true): Observable<ProgramaMantenimiento[]> {
        let params = new HttpParams().set('soloActivos', soloActivos.toString());
        return this.http.get<ProgramaMantenimiento[]>(`${this.base}/mantenimiento/programas`, { params });
    }

    getProgramasByVehiculo(idVehiculo: number): Observable<ProgramaMantenimiento[]> {
        return this.http.get<ProgramaMantenimiento[]>(`${this.base}/mantenimiento/programas/vehiculo/${idVehiculo}`);
    }

    getProgramaMantenimientoById(id: number): Observable<ProgramaMantenimiento> {
        return this.http.get<ProgramaMantenimiento>(`${this.base}/mantenimiento/programas/${id}`);
    }

    crearProgramaMantenimiento(dto: CrearProgramaMantenimiento): Observable<ProgramaMantenimiento> {
        return this.http.post<ProgramaMantenimiento>(`${this.base}/mantenimiento/programas`, dto);
    }

    actualizarProgramaMantenimiento(id: number, dto: ActualizarProgramaMantenimiento): Observable<ProgramaMantenimiento> {
        return this.http.put<ProgramaMantenimiento>(`${this.base}/mantenimiento/programas/${id}`, dto);
    }

    // ── HISTORIAL DE MANTENIMIENTOS ──

    getHistorialMantenimiento(filtros: FiltroHistorialMantenimiento): Observable<Mantenimiento[]> {
        let params = new HttpParams();
        if (filtros.IdVehiculo) params = params.set('IdVehiculo', filtros.IdVehiculo.toString());
        if (filtros.TipoMantenimiento) params = params.set('TipoMantenimiento', filtros.TipoMantenimiento.toString());
        if (filtros.FechaDesde) params = params.set('FechaDesde', filtros.FechaDesde);
        if (filtros.FechaHasta) params = params.set('FechaHasta', filtros.FechaHasta);
        if (filtros.Taller) params = params.set('Taller', filtros.Taller);
        return this.http.get<Mantenimiento[]>(`${this.base}/mantenimiento/historial`, { params });
    }

    getMantenimientoById(id: number): Observable<Mantenimiento> {
        return this.http.get<Mantenimiento>(`${this.base}/mantenimiento/historial/${id}`);
    }

    registrarMantenimiento(dto: CrearMantenimiento): Observable<Mantenimiento> {
        return this.http.post<Mantenimiento>(`${this.base}/mantenimiento/mantenimientos`, dto);
    }

    actualizarMantenimiento(id: number, dto: ActualizarMantenimiento): Observable<Mantenimiento> {
        return this.http.put<Mantenimiento>(`${this.base}/mantenimiento/mantenimientos/${id}`, dto);
    }

    // ── VISTAS DE ANÁLISIS ──

    getViajes(
        idVehiculo?: number,
        fechaDesde?: string,
        fechaHasta?: string
    ): Observable<TruckViajeDto[]> {
        let params = new HttpParams();
        if (idVehiculo) params = params.set('idVehiculo', idVehiculo.toString());
        if (fechaDesde) params = params.set('fechaDesde', fechaDesde);
        if (fechaHasta) params = params.set('fechaHasta', fechaHasta);
        return this.http.get<TruckViajeDto[]>(`${this.base}/mantenimiento/viajes`, { params });
    }

    getRendimiento(idVehiculo?: number): Observable<TruckRendimiento[]> {
        let params = new HttpParams();
        if (idVehiculo) params = params.set('idVehiculo', idVehiculo.toString());
        return this.http.get<TruckRendimiento[]>(`${this.base}/mantenimiento/rendimiento`, { params });
    }

    getAlertasMantenimiento(
        idVehiculo?: number,
        estado?: string
    ): Observable<TruckAlertaMantenimiento[]> {
        let params = new HttpParams();
        if (idVehiculo) params = params.set('idVehiculo', idVehiculo.toString());
        if (estado) params = params.set('estado', estado);
        return this.http.get<TruckAlertaMantenimiento[]>(`${this.base}/mantenimiento/alertas-mantenimiento`, { params });
    }

    getAlertasKmAnomalo(idVehiculo?: number): Observable<TruckAlertaKmAnomalo[]> {
        let params = new HttpParams();
        if (idVehiculo) params = params.set('idVehiculo', idVehiculo.toString());
        return this.http.get<TruckAlertaKmAnomalo[]>(`${this.base}/mantenimiento/alertas-km-anomalo`, { params });
    }
}