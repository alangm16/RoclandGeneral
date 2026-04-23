// src/app/modules/acceso-control/public/acceso-public.routes.ts
// ─────────────────────────────────────────────────────────────────────────────
// Rutas PÚBLICAS del módulo AccesoControl.
// La landing general ya no vive aquí — pertenece a modules/home.
// La raíz de este módulo es el selector de tipo de acceso.
// ─────────────────────────────────────────────────────────────────────────────

import { Routes } from '@angular/router';

export const ACCESO_PUBLIC_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/acceso-selector/acceso-selector.component').then(
        (m) => m.AccesoSelectorComponent
      ),
    title: 'Selección de Acceso — Rocland',
  },
  {
    path: 'aviso-privacidad',
    loadComponent: () =>
      import('./pages/aviso-privacidad/aviso-privacidad.component').then(
        (m) => m.AvisoPrivacidadComponent
      ),
    title: 'Aviso de Privacidad — Rocland',
  },
  {
    path: 'confirmacion',
    loadComponent: () =>
      import('./pages/confirmacion/confirmacion.component').then(
        (m) => m.ConfirmacionComponent
      ),
    title: 'Solicitud Enviada — Rocland',
  },
  {
    path: 'formularios',
    children: [
      {
        path: 'visitante',
        loadComponent: () =>
          import('./pages/visitante-form/visitante-form.component').then(
            (m) => m.VisitanteFormComponent
          ),
        title: 'Registro de Visitante — Rocland',
      },
      {
        path: 'proveedor',
        loadComponent: () =>
          import('./pages/proveedor-form/proveedor-form.component').then(
            (m) => m.ProveedorFormComponent
          ),
        title: 'Registro de Proveedor — Rocland',
      },
      {
        path: '',
        redirectTo: 'visitante',
        pathMatch: 'full',
      },
    ],
  },
];