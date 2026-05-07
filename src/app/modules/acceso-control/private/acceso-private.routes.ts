// src/app/modules/acceso-control/private/acceso-private.routes.ts
// ─────────────────────────────────────────────────────────────────────────────
// Rutas PRIVADAS del módulo AccesoControl.
// El guard y el layout ya fueron aplicados en acceso-control.routes.ts,
// aquí solo se definen las páginas internas.
//
// ESCALABILIDAD: añade nuevas páginas privadas aquí sin tocar ningún
// otro archivo de rutas.
// ─────────────────────────────────────────────────────────────────────────────

import { Routes } from '@angular/router';

export const ACCESO_PRIVATE_ROUTES: Routes = [
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent
      ),
    title: 'Dashboard — AccesoControl',
    data: { subheader: { title: 'Dashboard', showSearch: false } },
  },
  {
    path: 'historial',
    loadComponent: () =>
      import('./pages/historial/historial.component').then(
        (m) => m.HistorialComponent
      ),
    title: 'Historial — AccesoControl',
    data: { subheader: { title: 'Historial de Accesos', showSearch: true } },
  },
  {
    path: 'personas',
    loadComponent: () =>
      import('./pages/personas/personas.component').then(
        (m) => m.PersonasComponent
      ),
    title: 'Personas — AccesoControl',
    data: { subheader: { title: 'Personas', showSearch: true } },
  },
  {
    path: 'catalogos',
    loadComponent: () =>
      import('./pages/catalogos/catalogos.component').then(
        (m) => m.CatalogosComponent
      ),
    title: 'Catálogos — AccesoControl',
    data: { subheader: { title: 'Catálogos', showSearch: false } },
  },
  {
    path: 'usuarios',
    loadComponent: () =>
      import('./pages/usuarios/usuarios.component').then(
        (m) => m.GuardiasComponent
      ),
    title: 'Guardias — AccesoControl',
    data: {
      subheader: {
        title: 'Guardias',
        showSearch: true,
        showAddButton: true,
        addButtonLabel: 'Nuevo Guardia',
      },
    },
  },
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
];