// src/app/modules/acceso-control/services/admin.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/Environment';
import { 
  DashboardKpis, ActivoZona, FlujoHora, AreaRanking, FlujoDiario,
  PersonasPaginadas, PersonaPerfil, HistorialPersonaItem, 
  GuardiaResumen,
  GuardiasPaginados,
  GuardiaCreateDto,
  GuardiaUpdateDto
} from '../models/admin.models';

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

  getPersonas(page: number, pageSize: number, busqueda?: string): Observable<PersonasPaginadas> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (busqueda) {
      params = params.set('busqueda', busqueda);
    }

    return this.http.get<PersonasPaginadas>(`${this.adminUrl}/personas`, { params });
  }

  getPerfilPersona(id: number): Observable<PersonaPerfil> {
    return this.http.get<PersonaPerfil>(`${this.adminUrl}/personas/${id}`);
  }

  getHistorialPersona(id: number): Observable<HistorialPersonaItem[]> {
    return this.http.get<HistorialPersonaItem[]>(`${this.adminUrl}/personas/${id}/historial`);
  }

  getGuardias(page: number, pageSize: number, busqueda?: string): Observable<GuardiasPaginados> {
    let params = new HttpParams()
    .set('page', page.toString())
    .set('pageSize', pageSize.toString());
    if (busqueda) {
      params = params.set('busqueda', busqueda);
    }

    return this.http.get<GuardiasPaginados>(`${this.adminUrl}/guardias`, { params });
  }

  crearGuardia(dto: GuardiaCreateDto): Observable<void> {
    return this.http.post<void>(
      `${this.adminUrl}/guardias`,
      dto
    );
  }

  actualizarGuardia(id: number, dto: GuardiaUpdateDto): Observable<void> {
    return this.http.put<void>(
      `${this.adminUrl}/guardias/${id}`,
      dto
    );
  }

  resetPasswordGuardia(id: number, password: string): Observable<void> {
    return this.http.put<void>(
      `${this.adminUrl}/guardias/${id}/reset-password`,
      { password }
    );
  }
}