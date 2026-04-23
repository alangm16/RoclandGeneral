// src/app/app.routes.ts
// ─────────────────────────────────────────────────────────────────────────────
// ARCHIVO ORQUESTADOR — Rutas globales de la aplicación Rocland.
//
// Aquí SOLO van:
//   1. Rutas que pertenecen a la app en su conjunto (landing, auth).
//   2. Lazy-loads de cada módulo/proyecto.
//
// NUNCA definir rutas internas de un módulo aquí.
// Para agregar un proyecto: un único bloque loadChildren. Nada más.
// ─────────────────────────────────────────────────────────────────────────────

import { Routes } from '@angular/router';

export const routes: Routes = [

  // ── LANDING GENERAL (pertenece a Rocland, no a ningún módulo) ────────────
  {
    path: '',
    loadComponent: () =>
      import('./modules/home/pages/landing/landing.component').then(
        (m) => m.LandingComponent
      ),
    title: 'Bienvenido — Rocland',
    pathMatch: 'full',
  },

  // ── AUTH CENTRAL ──────────────────────────────────────────────────────────
  // Login con selector de proyectos. Punto de entrada administrativo.
  {
    path: 'auth',
    loadChildren: () =>
      import('./modules/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },

  // ── MÓDULOS / PROYECTOS ───────────────────────────────────────────────────
  // Cada proyecto es autónomo: define sus propias rutas públicas y privadas
  // dentro de su feature.routes.ts. Este archivo solo los registra.

  {
    path: '',
    loadChildren: () =>
      import('./modules/acceso-control/acceso-control.routes').then(
        (m) => m.ACCESO_CONTROL_ROUTES
      ),
  },

  // ── FUTUROS PROYECTOS (descomentar cuando existan) ────────────────────────
  // {
  //   path: '',
  //   loadChildren: () =>
  //     import('./modules/super-admin/super-admin.routes').then(
  //       (m) => m.SUPER_ADMIN_ROUTES
  //     ),
  // },

  // ── FALLBACK ──────────────────────────────────────────────────────────────
  {
    path: '**',
    redirectTo: '',
  },
];