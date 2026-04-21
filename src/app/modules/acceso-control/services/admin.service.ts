// src/app/modules/acceso-control/services/admin.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environmets/Environment';
import { DashboardKpis, ActivoZona, FlujoHora, AreaRanking, FlujoDiario } from '../models/admin.models';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private readonly http = inject(HttpClient);
  // Ajustamos la ruta según tu nueva estructura de controladores API
  private readonly adminUrl = `${environment.apiUrl}/api/web/accesocontrol/admin`;
  private readonly guardiasUrl = `${environment.apiUrl}/api/web/accesocontrol/guardias`;

  getKpis(): Observable<DashboardKpis> {
    return this.http.get<DashboardKpis>(`${this.adminUrl}/kpis`);
  }

  getActivosZona(): Observable<ActivoZona[]> {
    return this.http.get<ActivoZona[]>(`${this.guardiasUrl}/activosZona`);
  }

  getFlujoHoras(): Observable<FlujoHora[]> {
    return this.http.get<FlujoHora[]>(`${this.adminUrl}/flujo/horas`);
  }

  getAreasRanking(): Observable<AreaRanking[]> {
    return this.http.get<AreaRanking[]>(`${this.adminUrl}/areas/ranking`);
  }

  getFlujoDiario(anio: number, mes: number): Observable<FlujoDiario[]> {
    const params = new HttpParams()
      .set('anio', anio.toString())
      .set('mes', mes.toString());
      
    return this.http.get<FlujoDiario[]>(`${this.adminUrl}/flujo/diario`, { params });
  }
}