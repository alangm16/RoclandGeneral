import { Routes } from '@angular/router';
import { PrivateLayoutComponent } from '../../layouts/private-layout/private-layout.component';

export const TRUCK_CHECK_ROUTES: Routes = [
  {
    path: '',
    component: PrivateLayoutComponent,
    data: { proyectoCodigo: 'truck-check' },
    children: [

      // Redirección raíz
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

      // ── Dashboard ────────────────────────────────────────────── /dashboard
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./private/pages/dashboard/dashboard.component')
            .then(m => m.DashboardTruckComponent),
      },

      {
        path: 'historial',
        loadComponent: () =>
          import('./private/pages/historial/historial.component')
            .then(m => m.HistorialChecklistComponent),
      },

      {
        path: 'historial/:id',
        loadComponent: () =>
          import('./private/pages/historial/historial.component')
            .then(m => m.HistorialChecklistComponent),
      },

      {
        path: 'catalogos',
        loadComponent: () =>
          import('./private/pages/catalogos/catalogos.component')
            .then(m => m.CatalogosTruckCheckComponent),
      },

      // Wildcard — cualquier ruta desconocida vuelve al dashboard
      { path: '**', redirectTo: 'dashboard' },
    ],
  },
];