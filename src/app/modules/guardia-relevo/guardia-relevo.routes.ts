// guardia-relevo.routes.ts
// Rutas alineadas al sidebar:  /private/guardia-relevo/<ruta>
// Todas las rutas coinciden exactamente con el campo `Ruta` del seed SQL
// (sin el prefijo /private/guardia-relevo que viene del router parent).

import { Routes } from '@angular/router';
import { PrivateLayoutComponent } from '../../layouts/private-layout/private-layout.component';

export const GUARDIA_RELEVO_ROUTES: Routes = [
  {
    path: '',
    component: PrivateLayoutComponent,
    data: { proyectoCodigo: 'guardia-relevo' },
    children: [

      // Redirección raíz
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

      // ── Dashboard ────────────────────────────────────────────── /dashboard
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./private/pages/dashboard/dashboard.component')
            .then(m => m.DashboardComponent),
      },

      // ── Usuarios
      // {
      //   path: 'usuarios',
      //   loadComponent: () =>
      //     import('./private/pages/usuarios/usuarios.component')
      //       .then(m => m.UsuariosComponent),
      // },

      // ── Relevos
      {
        path: 'checklist',
        loadComponent: () =>
          import('./private/pages/checklist/checklist.component')
            .then(m => m.ChecklistComponent),
      },

      // ── Incidencias
      {
        path: 'incidencias',
        loadComponent: () =>
          import('./private/pages/incidencias/incidencias.component')
            .then(m => m.IncidenciasComponent),
      },
      // {
      //   // Configuración
      //   path: 'configuracion',
      //   loadComponent: () =>
      //     import('./private/pages/configuracion/configuracion.component')
      //       .then(m => m.ConfiguracionComponent),
      // },
      // {
      //   // Reportes
      //   path: 'reportes',
      //   loadComponent: () =>
      //     import('./private/pages/reportes/reportes.component')
      //       .then(m => m.ReportesComponent),
      // },

      // Wildcard — cualquier ruta desconocida vuelve al dashboard
      { path: '**', redirectTo: 'dashboard' },
    ],
  },
];