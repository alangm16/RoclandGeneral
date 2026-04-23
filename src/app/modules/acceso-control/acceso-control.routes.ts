// src/app/modules/acceso-control/acceso-control.routes.ts
// ─────────────────────────────────────────────────────────────────────────────
// FEATURE ROUTES — AccesoControl Web
//
// Este archivo es el único punto de entrada del módulo acceso-control.
// app.routes.ts lo carga con un lazy loadChildren y ya.
// Aquí se definen los segmentos propios del módulo:
//   public/acceso-control-web/...
//   private/acceso-control-web/...
//
// REGLA: layouts y guards se aplican AQUÍ, nunca en app.routes.ts.
// ─────────────────────────────────────────────────────────────────────────────

import { Routes } from '@angular/router';
import { PublicLayoutComponent }  from '../../layouts/public-layout/public-layout.component';
import { PrivateLayoutComponent } from '../../layouts/private-layout/private-layout.component';
import { authGuard }              from '../../core/auth/auth.guard';

export const ACCESO_CONTROL_ROUTES: Routes = [

  // ── ZONA PÚBLICA ──────────────────────────────────────────────────────────
  {
    path: 'public/acceso-control-web',
    component: PublicLayoutComponent,
    children: [
      {
        path: '',
        loadChildren: () =>
          import('./public/acceso-public.routes').then(
            (m) => m.ACCESO_PUBLIC_ROUTES
          ),
      },
    ],
  },

  // ── ZONA PRIVADA ──────────────────────────────────────────────────────────
  {
    path: 'private/acceso-control-web',
    component: PrivateLayoutComponent,
    canActivate: [authGuard],
    data: { renderMode: 'client' },
    children: [
      {
        path: '',
        loadChildren: () =>
          import('./private/acceso-private.routes').then(
            (m) => m.ACCESO_PRIVATE_ROUTES
          ),
      },
    ],
  },
];