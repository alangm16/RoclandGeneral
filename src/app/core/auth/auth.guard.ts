// src/app/core/auth/auth.guard.ts
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';
import { RolUsuario } from './auth.models';

// ── Helper: construye la redirección a login guardando la ruta destino ──
function redirigirALogin(router: Router, url: string): UrlTree {
  return router.createUrlTree(['/auth/login'], {
    queryParams: { returnUrl: url },
  });
}

// ── Guard general (Solo verifica que la sesión esté viva) ───────────
export const authGuard: CanActivateFn = (
  _route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): boolean | UrlTree => {
  const auth       = inject(AuthService);
  const router     = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) return redirigirALogin(router, state.url);
  if (auth.estaLogueado()) return true;

  return redirigirALogin(router, state.url);
};

// ── Guard de rol (Autorización dentro del módulo) ─────────────────
export function rolGuard(...rolesRequeridos: RolUsuario[]): CanActivateFn {
  return (
    _route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | UrlTree => {
    const auth       = inject(AuthService);
    const router     = inject(Router);
    const platformId = inject(PLATFORM_ID);

    if (!isPlatformBrowser(platformId)) return redirigirALogin(router, state.url);
    if (!auth.estaLogueado()) return redirigirALogin(router, state.url);

    if (auth.tieneRol(...rolesRequeridos)) return true;

    // Tiene sesión pero no el rol — mandarlo a su dashboard, no al login
    return router.createUrlTree([`/private/${auth.proyectoActual()}/dashboard`]);
  };
}

// ── Guard de proyecto (Blindaje anti-saltos entre módulos) ────────
export const proyectoGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): boolean | UrlTree => {
  const auth       = inject(AuthService);
  const router     = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) return redirigirALogin(router, state.url);
  if (!auth.estaLogueado()) return redirigirALogin(router, state.url);

  const proyectoActual = auth.proyectoActual(); // Ej: 'acceso-control-web'

  // Buscamos el proyecto requerido en la data de la ruta (o en sus padres si es ruta hija)
  let codigoRequerido = route.data['proyectoCodigo'];
  let parent = route.parent;
  
  while (!codigoRequerido && parent) {
    codigoRequerido = parent.data['proyectoCodigo'];
    parent = parent.parent;
  }

  // Si la ruta no exige un proyecto, o si el código coincide con la sesión del usuario:
  if (!codigoRequerido || codigoRequerido === proyectoActual) {
    return true;
  }

  // El usuario intentó entrar a la URL de un proyecto distinto al que se logueó
  console.warn(`[Seguridad] Bloqueado. Usuario activo en '${proyectoActual}' intentó acceder a '${codigoRequerido}'.`);
  
  // Lo regresamos a la raíz de su propio proyecto
  return router.createUrlTree([`/private/${proyectoActual}/dashboard`]);
};