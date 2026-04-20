import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CrearVisitanteRequest } from '../models/acceso.models';

@Injectable({
  providedIn: 'root'
})
export class AccesoService {
  private http = inject(HttpClient);
  // Reemplaza con tu variable de entorno en producción
  private apiUrl = 'https://192.168.1.70:443/api/web/accesocontrol';

  registrarVisitante(data: CrearVisitanteRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/visitantes`, data);
  }

  // Equivalente a tu endpoint GET /api/web/accesocontrol/personas/buscar?numId=...
  buscarPersona(numId: string): Observable<any> {
    const params = new HttpParams().set('numId', numId);
    return this.http.get(`${this.apiUrl}/personas/buscar`, { params });
  }
}