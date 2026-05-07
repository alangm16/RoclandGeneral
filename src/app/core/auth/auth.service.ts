// auth.service.ts
import { Injectable, inject, PLATFORM_ID, signal, computed } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, switchMap, map, of } from 'rxjs';

import {
  LoginRequest, LoginResponse, SesionActiva, ProyectoPermitido, PerfilModulo, RolUsuario
} from './auth.models';
import { environment } from '../../../environments/Environment';

const STORAGE_KEY = 'rocland_sesion';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http       = inject(HttpClient);
  private readonly router     = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly _sesion = signal<SesionActiva | null>(this.cargarSesionStorage());
  readonly sesion = this._sesion.asReadonly();
  
  readonly estaLogueado = computed(() => {
    const s = this._sesion();
    return s ? new Date(s.expiracion) > new Date() : false;
  });
  
  readonly rolActual = computed(() => this._sesion()?.rolModulo ?? null);
  readonly proyectoActual = computed(() => this._sesion()?.proyectoId ?? '');
  readonly nombreUsuario = computed(() => this._sesion()?.nombre ?? '');
  readonly proyectoNombre = computed(() => this._sesion()?.proyectoNombre ?? '');
  readonly miPerfilId = computed(() => this._sesion()?.perfilId ?? 0);

  tieneRol(...roles: RolUsuario[]): boolean {
    const rol = this.rolActual();
    return rol !== null && roles.includes(rol);
  }

  esAdmin(): boolean {
    return this.tieneRol('Guardia', 'Supervisor');
  }

  // ── 1. DESCUBRIMIENTO DE IDENTIDAD ──────────────────────────────
  descubrirProyectos(identificador: string): Observable<ProyectoPermitido[]> {
    return this.http.get<ProyectoPermitido[]>(
      `${environment.apiUrl}/api/superadmin/auth/descubrir-proyectos`,
      { params: { identificador } }
    );
  }

  // ── 2. LOGIN FINAL Y CONSTRUCCIÓN DE SESIÓN ─────────────────────
  login(credenciales: LoginRequest, proyecto: ProyectoPermitido): Observable<SesionActiva> {
    const endpointSuperAdmin = `${environment.apiUrl}/api/superadmin/auth/login`;

    return this.http.post<LoginResponse>(endpointSuperAdmin, credenciales).pipe(
      switchMap((superAdminRes) => {
        // A. Verificar si SuperAdmin realmente autoriza este proyecto
        const tieneProyecto = superAdminRes.proyectosPermitidos.some(p => p.codigo === proyecto.codigo);
        if (!tieneProyecto) {
          return throwError(() => new Error('NO_PROJECT_ACCESS'));
        }

        // B. Si el destino es SUPER-ADMIN, construimos la sesión directo (no hay perfil local)
        if (proyecto.codigo === 'super-admin') {
          const sesionSuperAdmin: SesionActiva = {
            perfilId: 0, // En SuperAdmin nos basamos en el Token general
            token: superAdminRes.accessToken,
            refreshToken: superAdminRes.refreshToken,
            nombre: superAdminRes.nombreCompleto,
            rolesSuperAdmin: superAdminRes.roles,
            rolModulo: 'Administrador' as RolUsuario, // Rol virtual para dar acceso a todo en este panel
            expiracion: superAdminRes.accessTokenExpira,
            proyectoId: proyecto.codigo,
            proyectoNombre: proyecto.nombre,
            vistasPermitidas: proyecto.vistas || [],
            permisos: {
              puedeLeer: proyecto.puedeLeer, puedeCrear: proyecto.puedeCrear,
              puedeEditar: proyecto.puedeEditar, puedeBorrar: proyecto.puedeBorrar
            }
          };
          this.guardarSesion(sesionSuperAdmin);
          return of(sesionSuperAdmin); // Devolvemos el observable envuelto
        }

        // C. Si el destino es un MÓDULO (Acceso Control Web), consultamos su perfil local
        const headers = new HttpHeaders({ Authorization: `Bearer ${superAdminRes.accessToken}` });
        const endpointPerfil = `${environment.apiUrl}/api/web/accesocontrol/auth/mi-perfil`;

        return this.http.get<PerfilModulo>(endpointPerfil, { headers }).pipe(
          map((perfilRes) => {
            if (perfilRes.tipoPerfil !== 'Supervisor' && perfilRes.tipoPerfil !== 'Administrador') {
              throw new Error('NO_MODULE_ROLE');
            }

            const sesionFinal: SesionActiva = {
              perfilId: perfilRes.id,
              token: superAdminRes.accessToken,
              refreshToken: superAdminRes.refreshToken,
              nombre: perfilRes.nombreCompleto,
              rolesSuperAdmin: superAdminRes.roles,
              rolModulo: perfilRes.tipoPerfil as RolUsuario,
              expiracion: superAdminRes.accessTokenExpira,
              proyectoId: proyecto.codigo, // Usamos 'codigo' de la BD, ej: 'acceso-control-web'
              proyectoNombre: proyecto.nombre,
              vistasPermitidas: proyecto.vistas || [],
              permisos: {
                puedeLeer: proyecto.puedeLeer, puedeCrear: proyecto.puedeCrear,
                puedeEditar: proyecto.puedeEditar, puedeBorrar: proyecto.puedeBorrar
              }
            };

            this.guardarSesion(sesionFinal);
            return sesionFinal;
          }),
          catchError((err) => {
            if (err.message === 'NO_MODULE_ROLE') return throwError(() => err);
            return throwError(() => new Error('NO_MODULE_PROFILE'));
          })
        );
      })
    );
  }

  navegarPostLogin(queryParams: { returnUrl?: string }, proyectoId: string): void {
    const destino = queryParams['returnUrl'] ?? `/private/${proyectoId}/dashboard`;
    const esRutaInterna = destino.startsWith('/');
    this.router.navigateByUrl(esRutaInterna ? destino : `/private/${proyectoId}/dashboard`);
  }

  logout(): void {
    this.limpiarSesion();
    this.router.navigate(['/auth/login']);
  }

  getToken(): string | null {
    return this._sesion()?.token ?? null;
  }

  // Métodos privados para manejar el Storage local
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

  private cargarSesionStorage(): SesionActiva | null {
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
    } catch {
      return null;
    }
  }
}