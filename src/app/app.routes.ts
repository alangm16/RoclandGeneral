// src/app/app.routes.ts

import { Routes } from '@angular/router';
import { authGuard, proyectoGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },
  {
    path: 'auth',
    loadChildren: () => import('./modules/auth/auth.routes').then(m => m.AUTH_ROUTES)
  },
  {
    path: 'private/super-admin',
    loadChildren: () => import('./modules/super-admin/super-admin.routes').then(m => m.SUPER_ADMIN_ROUTES),
    canActivate: [authGuard, proyectoGuard], 
    data: { proyectoCodigo: 'super-admin' } 
  },
  {
    path: 'private/acceso-control',
    loadChildren: () => import('./modules/acceso-control/acceso-control.routes').then(m => m.ACCESO_CONTROL_ROUTES),
    canActivate: [authGuard, proyectoGuard], 
    data: { proyectoCodigo: 'acceso-control-web' } 
  }
];