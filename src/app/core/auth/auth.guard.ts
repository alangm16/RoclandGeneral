// auth.guard.ts
// Rocland — Guard de rutas privadas
// Sprint 4

import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from './auth.service';
import { RolUsuario } from './auth.models';

// ── Guard general: solo requiere sesión activa ────────────────────
export const authGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (auth.estaLogueado()) return true;

  // Redirigir al login conservando la URL destino para redirect post-login
  router.navigate(['/private/login']);
  return false;
};

// ── Guard de rol: requiere uno de los roles especificados ─────────
// Uso en rutas:
//   canActivate: [rolGuard('Admin', 'Supervisor')]
export function rolGuard(...rolesRequeridos: RolUsuario[]): CanActivateFn {
  return () => {
    const auth   = inject(AuthService);
    const router = inject(Router);

    if (!auth.estaLogueado()) {
      router.navigate(['/private/login']);
      return false;
    }

    if (auth.tieneRol(...rolesRequeridos)) return true;

    // Tiene sesión pero no el rol requerido → redirigir a su dashboard
    const proyectoId = auth.proyectoActual();
    router.navigate([`/private/${proyectoId}/dashboard`]);
    return false;
  };
}

// ── Guard de proyecto: verifica que el usuario pertenece al proyecto de la ruta ──
// Evita que un usuario de 'inventario-web' entre a rutas de 'acceso-control-web'
export const proyectoGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (!auth.estaLogueado()) {
    router.navigate(['/private/login']);
    return false;
  }

  // Extrae el segmento del proyecto de la URL (ej: 'acceso-control-web')
  const proyectoEnRuta = route.pathFromRoot
    .map(r => r.url.map(u => u.path).join('/'))
    .join('/')
    .split('/')
    .find(seg => seg && seg !== 'private');

  const proyectoActual = auth.proyectoActual();

  if (!proyectoEnRuta || proyectoEnRuta === proyectoActual) return true;

  // El usuario intenta entrar a un proyecto distinto al de su sesión
  router.navigate([`/private/${proyectoActual}/dashboard`]);
  return false;
};