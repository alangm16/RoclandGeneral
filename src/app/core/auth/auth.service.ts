import { Injectable, inject, PLATFORM_ID, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/Environment';
import { SuperadminService } from '../../modules/super-admin/services/super-admin.service';
import {
  AuthMaestroResponse,
  AuthResultResponse,
  SesionActiva,
  ProyectoAcceso,
  LoginMaestroRequest,
  LoginDirectoRequest
} from './auth.models';

const STORAGE_KEY = 'rocland_sesion_sa';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private superAdminSvc = inject(SuperadminService);

  private _sesion = signal<SesionActiva | null>(this.cargarSesion());
  readonly sesion = this._sesion.asReadonly();

  readonly estaLogueado = computed(() => {
    const s = this._sesion();
    return s ? new Date(s.expiracion) > new Date() : false;
  });

  readonly usuario = computed(() => this._sesion()?.usuario);
  readonly proyectosAccesibles = computed(() => this._sesion()?.proyectosAccesibles ?? []);
  readonly proyectoActivo = computed(() => this._sesion()?.proyectoActivo);
  readonly nombreUsuario = computed(() => this._sesion()?.usuario?.nombreCompleto ?? '');

  // ── Descubrir proyectos por username (sin contraseña) ─────────────
  descubrirProyectos(username: string): Observable<ProyectoAcceso[]> {
    const params = new HttpParams().set('username', username);
    return this.http.get<ProyectoAcceso[]>(
      `${environment.apiUrl}/api/superadmin/auth/proyectos`,
      { params }
    );
  }

  // ── Login Maestro (orquestador) ──────────────────────────────────
  loginMaestro(creds: LoginMaestroRequest): Observable<AuthMaestroResponse> {
    const url = `${environment.apiUrl}/api/superadmin/auth/login-maestro`;
    return this.http.post<AuthMaestroResponse>(url, creds).pipe(
      tap(response => {
        const sesion: SesionActiva = {
          token: response.accessToken,
          refreshToken: response.refreshToken,
          expiracion: response.expiracion,
          usuario: response.usuario,
          proyectosAccesibles: response.proyectosAccesibles,
          proyectoActivo: undefined
        };
        const superAdminProj = response.proyectosAccesibles.find(p => p.codigo === 'super-admin');
        if (superAdminProj) {
            sesion.proyectoActivo = superAdminProj;
        }
        this.guardarSesion(sesion);
        if (sesion.proyectoActivo) {
          this.superAdminSvc.registrarDispositivo({ deviceToken: 'web' }).subscribe({
            error: (err) => console.warn('No se pudo registrar dispositivo', err)
          });
        }
        this.router.navigate(['/private/super-admin/dashboard']);
        this.guardarSesion(sesion);
        // No navegar aquí; lo hará el componente
      })
    );
  }

  // ── Login Directo (a un proyecto específico) ─────────────────────
  loginDirecto(creds: LoginDirectoRequest): Observable<AuthResultResponse> {
    const url = `${environment.apiUrl}/api/superadmin/auth/login-directo`;
    return this.http.post<AuthResultResponse>(url, creds).pipe(
      tap(response => {
        const claims = this.decodificarToken(response.accessToken);
        const proyecto: ProyectoAcceso = {
          id: +claims['proyectoId'] || 0,          // ahora sí obtiene el ID real
          codigo: claims['codigoProyecto'] || creds.codigoProyecto,
          nombre: creds.codigoProyecto,
          plataforma: claims['plataforma'] || creds.plataforma,
          iconoCss: undefined,
          urlBase: undefined,
          rolEnProyecto: claims['nombreRol'] || '',
          nivelRol: +claims['nivelRol'] || 0
        };
        const sesion: SesionActiva = {
          token: response.accessToken,
          refreshToken: response.refreshToken,
          expiracion: response.expiracion,
          usuario: response.usuario,
          proyectosAccesibles: [],
          proyectoActivo: proyecto
        };
        this.guardarSesion(sesion);
        if (sesion.proyectoActivo) {
        this.superAdminSvc.registrarDispositivo({ deviceToken: 'web' }).subscribe({
          error: (err) => console.warn('No se pudo registrar dispositivo', err)
        });
      }
        // ← Sin navegación aquí; la hace el componente
      })
    );
  }

  // ── Seleccionar proyecto activo (para tokens maestros) ───────────
  seleccionarProyecto(proyecto: ProyectoAcceso): void {
    const s = this._sesion();
    if (!s) return;
    this.guardarSesion({ ...s, proyectoActivo: proyecto });
  }

  // ── Logout ────────────────────────────────────────────────────────
  logout(): void {
    this.limpiarSesion();
    this.router.navigate(['/auth/login']);
  }

  getToken(): string | null {
    return this._sesion()?.token ?? null;
  }

  // ── Persistencia local ────────────────────────────────────────────
  private guardarSesion(sesion: SesionActiva): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sesion));
    }
    this._sesion.set(sesion);
  }

  private limpiarSesion(): void {
    if (isPlatformBrowser(this.platformId)) localStorage.removeItem(STORAGE_KEY);
    this._sesion.set(null);
  }

  private cargarSesion(): SesionActiva | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const sesion: SesionActiva = JSON.parse(raw);
      if (new Date(sesion.expiracion) <= new Date()) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return sesion;
    } catch { return null; }
  }

  limpiarSesionExpirada(): void {
    const s = this._sesion();
    if (s && new Date(s.expiracion) <= new Date()) {
      this.limpiarSesion();
    }
  }

  // ── Decodificar JWT (payload) ─────────────────────────────────────
  private decodificarToken(token: string): Record<string, any> {
    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload));
    } catch { return {}; }
  }
}