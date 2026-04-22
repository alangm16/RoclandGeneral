// src/app/app.routes.ts — Sprint 4
// Se agregan las rutas privadas con AuthGuard y PrivateLayout.

import { Routes } from '@angular/router';
import { PublicLayoutComponent }  from './layouts/public-layout/public-layout.component';
import { PrivateLayoutComponent } from './layouts/private-layout/private-layout.component';
import { authGuard }              from './core/auth/auth.guard';

export const routes: Routes = [

  // ── ZONA PÚBLICA ─────────────────────────────────────────────
  {
    path: 'public',
    component: PublicLayoutComponent,
    children: [
      {
        path: 'acceso-control-web',
        loadChildren: () =>
          import('./modules/acceso-control/public/acceso-public.routes').then(
            (m) => m.ACCESO_PUBLIC_ROUTES
          ),
      },
    ],
  },

  // ── LOGIN (sin layout privado — tiene su propio shell) ────────
  {
    path: 'private/login',
    loadComponent: () =>
      import('./modules/auth/login/login.component').then(
        (m) => m.LoginComponent
      ),
    title: 'Iniciar Sesión — Rocland',
  },

  // ── ZONA PRIVADA — AccesoControl Web ─────────────────────────
  {
    path: 'private/acceso-control-web',
    component: PrivateLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        // Sprint 5: se crea el componente real del dashboard
        loadComponent: () =>
          import('./modules/acceso-control/private/pages/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent
          ),
        title: 'Dashboard — AccesoControl',
        data: { subheader: { title: 'Dashboard', showSearch: false } }
      },
      {
        path: 'historial',
        loadComponent: () =>
          import('./modules/acceso-control/private/pages/historial/historial.component').then(
            (m) => m.HistorialComponent
          ),
        title: 'Historial — AccesoControl',
        data: { subheader: { title: 'Historial de Accesos', showSearch: true } }
      },
      {
        path: 'personas',
        loadComponent: () =>
          import('./modules/acceso-control/private/pages/personas/personas.component').then(
            (m) => m.PersonasComponent
          ),
        title: 'Personas — AccesoControl',
        data: { subheader: { title: 'Personas', showSearch: true} }
      },
      {
        path: 'catalogos',
        loadComponent: () =>
          import('./modules/acceso-control/private/pages/catalogos/catalogos.component').then(
            (m) => m.CatalogosComponent
          ),
        title: 'Catálogos — AccesoControl',
        data: { subheader: { title: 'Catálogos', showSearch: false } }
      },
      {
        path: 'guardias',
        loadComponent: () =>
          import('./modules/acceso-control/private/pages/guardias/guardias.component').then(
            (m) => m.GuardiasComponent
          ),
        title: 'Guardias — AccesoControl',
        data: { subheader: { title: 'Guardias', showSearch: true, showAddButton: true, addButtonLabel: 'Nuevo Guardia' } }
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },

  // ── ZONA PRIVADA — Super Admin (Sprint futuro) ────────────────
  // {
  //   path: 'private/super-admin',
  //   component: PrivateLayoutComponent,
  //   canActivate: [authGuard, rolGuard('Admin')],
  //   children: [...]
  // },

  // ── Redirecciones ─────────────────────────────────────────────
  {
    path: '',
    redirectTo: 'public/acceso-control-web',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'public/acceso-control-web',
  },
];