import { environment } from "../../../../environments/Environment";
import { Injectable, inject } from "@angular/core";
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class SuperAdminService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/api/superadmin/usuarios`;

  getUsuarios(pagina: number, porPagina: number, busqueda?: string) {
    return this.http.get<any>(`${this.url}`, {
      params: { pagina, porPagina, busqueda: busqueda || '' }
    });
  }
  
  resetPassword(usuarioId: number) {
    return this.http.post(`${this.url}/${usuarioId}/reset-password`, {});
  }
}