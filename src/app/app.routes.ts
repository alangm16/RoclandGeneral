// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard, proyectoGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },
  {
    path: 'auth',
    loadChildren: () => import('./modules/auth/auth.routes').then(m => m.AUTH_ROUTES)
  },
  
  // ── MÓDULO: SUPER ADMIN ──────────────────────────────────────────
  {
    path: 'private/super-admin',
    canActivate: [authGuard, proyectoGuard], 
    data: { proyectoCodigo: 'super-admin' },
    loadChildren: () => import('./modules/super-admin/super-admin.routes').then(m => m.SUPER_ADMIN_ROUTES)
  },

  // ── MÓDULO: ACCESO CONTROL WEB ───────────────────────────────────
  {
    path: 'private/acceso-control-web',
    canActivate: [authGuard, proyectoGuard], 
    data: { proyectoCodigo: 'acceso-control-web' },
    loadChildren: () => import('./modules/acceso-control/acceso-control.routes').then(m => m.ACCESO_CONTROL_ROUTES)
  }
];