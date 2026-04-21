// auth.service.ts
// Rocland — Servicio de Autenticación Global
// Sprint 4

import { Injectable, inject, PLATFORM_ID, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';

import {
  LoginRequest,
  LoginResponse,
  SesionActiva,
  ProyectoDisponible,
  RolUsuario,
} from './auth.models';
import { PROYECTOS_HARDCODED } from './proyecto-catalog';

const STORAGE_KEY = 'rocland_sesion';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly http       = inject(HttpClient);
  private readonly router     = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  // ── Estado reactivo con Signals (Angular 17+) ─────────────────
  // Permite que cualquier componente reaccione al estado de sesión
  // sin necesidad de BehaviorSubject ni async pipe manual.
  private readonly _sesion = signal<SesionActiva | null>(this.cargarSesionStorage());

  readonly sesion    = this._sesion.asReadonly();
  readonly estaLogueado = computed(() => {
    const s = this._sesion();
    if (!s) return false;
    // Verificar que el token no haya expirado localmente
    return new Date(s.expiracion) > new Date();
  });
  readonly rolActual    = computed(() => this._sesion()?.rol ?? null);
  readonly nombreUsuario = computed(() => this._sesion()?.nombre ?? '');
  readonly proyectoActual = computed(() => this._sesion()?.proyectoId ?? '');

  // ── Catálogo de proyectos ─────────────────────────────────────
  // Sprint 4: hardcodeado
  // TODO Sprint Super-Admin: reemplazar por llamada HTTP
  //   GET /api/super-admin/proyectos?usuarioId={id}
  readonly proyectosDisponibles: ProyectoDisponible[] = PROYECTOS_HARDCODED;

  getProyectosActivos(): ProyectoDisponible[] {
    return this.proyectosDisponibles.filter(p => p.activo);
  }

  getProyecto(id: string): ProyectoDisponible | undefined {
    return this.proyectosDisponibles.find(p => p.id === id);
  }

  // ── Login ─────────────────────────────────────────────────────
  // Selecciona el endpoint correcto según el proyecto elegido.
  // Por ahora todos los logins van al endpoint de admin/supervisor.
  // Si en el futuro el rol "Guardia" tiene su propia pantalla,
  // se puede agregar un parámetro `tipoLogin: 'admin' | 'guardia'`.
  login(
    credenciales: LoginRequest,
    proyecto: ProyectoDisponible
  ): Observable<LoginResponse> {
    const endpoint = proyecto.loginEndpoint.admin;

    return this.http.post<LoginResponse>(endpoint, credenciales).pipe(
      tap((response) => this.guardarSesion(response, proyecto)),
      catchError((err) => {
        // Limpiar cualquier sesión parcial si falla
        this.limpiarSesion();
        return throwError(() => err);
      })
    );
  }

  // ── Logout ────────────────────────────────────────────────────
  logout(): void {
    this.limpiarSesion();
    this.router.navigate(['/private/login']);
  }

  // ── Token para el interceptor ─────────────────────────────────
  getToken(): string | null {
    return this._sesion()?.token ?? null;
  }

  // ── Guards de rol ─────────────────────────────────────────────
  tieneRol(...roles: RolUsuario[]): boolean {
    const rol = this.rolActual();
    return rol !== null && roles.includes(rol);
  }

  esAdmin(): boolean {
    return this.tieneRol('Admin', 'Supervisor');
  }

  // ── Storage privado ───────────────────────────────────────────
  private guardarSesion(response: LoginResponse, proyecto: ProyectoDisponible): void {
    const sesion: SesionActiva = {
      token:          response.token,
      nombre:         response.nombre,
      rol:            response.rol,
      id:             response.id,
      expiracion:     response.expiracion,
      proyectoId:     proyecto.id,
      proyectoNombre: proyecto.nombre,
    };

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sesion));
    }

    this._sesion.set(sesion);
  }

  private limpiarSesion(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(STORAGE_KEY);
    }
    this._sesion.set(null);
  }

  private cargarSesionStorage(): SesionActiva | null {
    // Solo en browser — SSR no tiene localStorage
    if (typeof window === 'undefined') return null;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;

      const sesion: SesionActiva = JSON.parse(raw);

      // Validar que el token no haya expirado
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