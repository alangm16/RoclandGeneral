// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard, proyectoGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  
  // ── 1. LANDING PAGE (Puerta de entrada global) ───────────────
  { 
    path: '', 
    loadComponent: () => import('./modules/home/pages/landing/landing.component').then(m => m.LandingComponent)
  },

  // ── 2. AUTENTICACIÓN ─────────────────────────────────────────
  {
    path: 'auth',
    loadChildren: () => import('./modules/auth/auth.routes').then(m => m.AUTH_ROUTES)
  },

  // ── 3. ZONA PÚBLICA (Módulos sin login, ej. Formularios) ─────
  {
    path: 'public/acceso-control-web',
    loadChildren: () => import('./modules/acceso-control/public/acceso-public.routes').then(m => m.ACCESO_PUBLIC_ROUTES)
  },
  
  // ── 4. ZONA PRIVADA (Módulos protegidos por login) ───────────
  {
    path: 'private/super-admin',
    canActivate: [authGuard, proyectoGuard], 
    data: { proyectoCodigo: 'super-admin' },
    loadChildren: () => import('./modules/super-admin/super-admin.routes').then(m => m.SUPER_ADMIN_ROUTES)
  },
  {
    path: 'private/acceso-control-web',
    canActivate: [authGuard, proyectoGuard], 
    data: { proyectoCodigo: 'acceso-control-web' },
    loadChildren: () => import('./modules/acceso-control/acceso-control.routes').then(m => m.ACCESO_CONTROL_ROUTES)
  }
];