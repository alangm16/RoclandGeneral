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
      {
        path: 'gestion-mantenimiento',
        loadComponent: () => import('./private/pages/gestion-mantenimiento/gestion-mantenimiento.component').then(m => m.GestionMantenimientoComponent)
      },
      {
        path: 'historial-mantenimiento',
        loadComponent: () => import('./private/pages/historial-mantenimiento/historial-mantenimiento.component').then(m => m.HistorialMantenimientoComponent)
      },
      {
        path: 'alertas-mantenimiento',
        loadComponent: () => import('./private/pages/alertas-mantenimiento/alertas-mantenimiento.component').then(m => m.AlertasMantenimientoComponent)
      },
      {
        path: 'alertas-km-anomalo',
        loadComponent: () => import('./private/pages/alertas-km-anomalo/alertas-km-anomalo.component').then(m => m.AlertasKmAnomaloComponent)
      },

      // Wildcard — cualquier ruta desconocida vuelve al dashboard
      { path: '**', redirectTo: 'dashboard' },
    ],
  },
];