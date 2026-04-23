// src/app/app.routes.server.ts
// ─────────────────────────────────────────────────────────────────────────────
// Configuración de rendering para Angular SSR.
// Las rutas dinámicas (con parámetros o guardias) deben ser Server-side.
// Las rutas puramente estáticas pueden ser Prerender.
// ─────────────────────────────────────────────────────────────────────────────

import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [

  // Zona pública — se puede prerenderizar (sin guardias, contenido estático)
  {
    path: 'public/**',
    renderMode: RenderMode.Prerender,
  },

  // Auth — server-side (puede tener redirects dinámicos post-login)
  {
    path: 'auth/**',
    renderMode: RenderMode.Server,
  },

  // Zona privada — siempre server-side (requiere authGuard, datos del usuario)
  {
    path: 'private/**',
    renderMode: RenderMode.Server,
  },

  // Fallback global
  {
    path: '**',
    renderMode: RenderMode.Server,
  },
];