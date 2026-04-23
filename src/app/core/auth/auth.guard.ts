// auth.guard.ts
// Rocland — Guard de rutas privadas
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from './auth.service';
import { RolUsuario } from './auth.models';

// ── Guard general: solo requiere sesión activa ────────────────────
export const authGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // Evitar redirecciones prematuras en el servidor (SSR)
  if (!isPlatformBrowser(platformId)) return true;

  if (auth.estaLogueado()) return true;

  // CORREGIDO: Redirigir a /auth/login
  router.navigate(['/auth/login']);
  return false;
};

// ── Guard de rol: requiere uno de los roles especificados ─────────
export function rolGuard(...rolesRequeridos: RolUsuario[]): CanActivateFn {
  return () => {
    const auth   = inject(AuthService);
    const router = inject(Router);
    const platformId = inject(PLATFORM_ID);

    if (!isPlatformBrowser(platformId)) return true;

    if (!auth.estaLogueado()) {
      // CORREGIDO: Redirigir a /auth/login
      router.navigate(['/auth/login']);
      return false;
    }

    if (auth.tieneRol(...rolesRequeridos)) return true;

    const proyectoId = auth.proyectoActual();
    router.navigate([`/private/${proyectoId}/dashboard`]);
    return false;
  };
}

// ── Guard de proyecto: verifica que el usuario pertenece al proyecto de la ruta ──
export const proyectoGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) return true;

  if (!auth.estaLogueado()) {
    // CORREGIDO: Redirigir a /auth/login
    router.navigate(['/auth/login']);
    return false;
  }

  const proyectoEnRuta = route.pathFromRoot
    .map(r => r.url.map(u => u.path).join('/'))
    .join('/')
    .split('/')
    .find(seg => seg && seg !== 'private');

  const proyectoActual = auth.proyectoActual();

  if (!proyectoEnRuta || proyectoEnRuta === proyectoActual) return true;

  router.navigate([`/private/${proyectoActual}/dashboard`]);
  return false;
};