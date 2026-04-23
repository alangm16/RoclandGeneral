// src/app/modules/auth/auth.routes.ts
// ─────────────────────────────────────────────────────────────────────────────
// Rutas del módulo Auth.
// El login es el punto de entrada central de la app: autentica al usuario
// y le presenta un selector de proyectos disponibles según su rol/permisos.
//
// ESCALABILIDAD: cuando agregues autenticación de dos factores, recuperación
// de contraseña, etc., añade las rutas aquí. Nunca en app.routes.ts.
// ─────────────────────────────────────────────────────────────────────────────

import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./login/login.component').then((m) => m.LoginComponent),
    title: 'Iniciar Sesión — Rocland',
  },

  // ── FUTUROS (descomentar cuando existan) ──────────────────────────────────
  // {
  //   path: 'recuperar-contrasena',
  //   loadComponent: () =>
  //     import('./recuperar/recuperar.component').then((m) => m.RecuperarComponent),
  //   title: 'Recuperar Contraseña — Rocland',
  // },
  // {
  //   path: 'dos-factores',
  //   loadComponent: () =>
  //     import('./two-factor/two-factor.component').then((m) => m.TwoFactorComponent),
  //   title: 'Verificación — Rocland',
  // },

  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
];