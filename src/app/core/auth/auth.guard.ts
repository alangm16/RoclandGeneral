// auth.guard.ts
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

// ── Guard general ─────────────────────────────────────────────────
export const authGuard: CanActivateFn = (
  _route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): boolean | UrlTree => {
  const auth       = inject(AuthService);
  const router     = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // SSR: sin localStorage, redirigir a login con returnUrl
  if (!isPlatformBrowser(platformId)) {
    return redirigirALogin(router, state.url);
  }

  if (auth.estaLogueado()) return true;

  return redirigirALogin(router, state.url);
};

// ── Guard de rol ──────────────────────────────────────────────────
export function rolGuard(...rolesRequeridos: RolUsuario[]): CanActivateFn {
  return (
    _route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | UrlTree => {
    const auth       = inject(AuthService);
    const router     = inject(Router);
    const platformId = inject(PLATFORM_ID);

    if (!isPlatformBrowser(platformId)) {
      return redirigirALogin(router, state.url);
    }

    if (!auth.estaLogueado()) {
      return redirigirALogin(router, state.url);
    }

    if (auth.tieneRol(...rolesRequeridos)) return true;

    // Tiene sesión pero no el rol — mandarlo a su dashboard, no al login
    return router.createUrlTree([`/private/${auth.proyectoActual()}/dashboard`]);
  };
}

// ── Guard de proyecto ─────────────────────────────────────────────
export const proyectoGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): boolean | UrlTree => {
  const auth       = inject(AuthService);
  const router     = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) {
    return redirigirALogin(router, state.url);
  }

  if (!auth.estaLogueado()) {
    return redirigirALogin(router, state.url);
  }

  const proyectoEnRuta = route.pathFromRoot
    .map(r => r.url.map(u => u.path).join('/'))
    .join('/')
    .split('/')
    .find(seg => seg && seg !== 'private');

  const proyectoActual = auth.proyectoActual();

  if (!proyectoEnRuta || proyectoEnRuta === proyectoActual) return true;

  return router.createUrlTree([`/private/${proyectoActual}/dashboard`]);
};