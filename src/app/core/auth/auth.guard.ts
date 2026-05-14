// auth.guard.ts (ajustado)
import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.estaLogueado()) return true;
  return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
};

// Guard de rol basado en RolSA (SuperAdmin, Admin, Auditor)
export function rolGuard(...rolesPermitidos: string[]): CanActivateFn {
  return (route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (!auth.estaLogueado()) {
      return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
    }
    const proyecto = auth.proyectoActivo();
    const rol = proyecto?.rolEnProyecto;
    if (rol && rolesPermitidos.includes(rol)) return true;
    // Redirigir a dashboard del proyecto activo si lo hay, o a proyectos
    if (proyecto) {
      return router.createUrlTree(['/private', proyecto.codigo, 'dashboard']);
    }
    return router.createUrlTree(['/proyectos']);
  };
}

// Guard de proyecto (evita saltos entre módulos)
export const proyectoGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.estaLogueado()) {
    return router.createUrlTree(['/auth/login']);
  }
  const proyectoActivo = auth.proyectoActivo();
  if (!proyectoActivo) {
    // Si no hay proyecto activo, redirigir al login
    return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
  }
  const codigoUrl = route.parent?.data?.['proyectoCodigo'] ?? route.data?.['proyectoCodigo'];
  if (!codigoUrl || codigoUrl === proyectoActivo.codigo) return true;
  return router.createUrlTree(['/private', proyectoActivo.codigo, 'dashboard']);
};