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
    ViajesCamionMensual
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
}