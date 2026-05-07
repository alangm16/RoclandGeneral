// proyecto-catalog.ts
// Rocland — Catálogo de Proyectos disponibles en el Login
// Sprint 4: hardcodeado
//
// ══════════════════════════════════════════════════════════════════
// TODO (Sprint Super-Admin): reemplazar PROYECTOS_HARDCODED por
// una llamada HTTP al endpoint de proyectos del super-admin:
//
//   GET /api/super-admin/proyectos?usuarioId={id}
//   Response: ProyectoDisponible[]
//
// El backend filtrará los proyectos según los permisos del usuario,
// exactamente como describes: el Super-Admin configura qué proyectos
// ve cada usuario en el selector.
//
// Cuando ese sprint llegue, este archivo se elimina y el
// AuthService.cargarProyectos() hará la llamada HTTP.
// ══════════════════════════════════════════════════════════════════

import { ProyectoDisponible } from './auth.models';
import { environment } from '../../../environments/Environment';

export const PROYECTOS_HARDCODED: ProyectoDisponible[] = [
  {
    id:          'acceso-control-web',
    nombre:      'AccesoControl Web',
    descripcion: 'Panel de control de acceso a instalaciones',
    icono:       'bi-shield-lock-fill',
    rutaBase:    '/private/acceso-control-web',
    activo:      true,
  },

  // ── Proyectos futuros (comentados como plantilla) ─────────────
  // {
  //   id:          'inventario-web',
  //   nombre:      'Inventario Web',
  //   descripcion: 'Gestión de inventario y almacén',
  //   icono:       'bi-box-seam-fill',
  //   loginEndpoint: {
  //     admin:   `${environment.apiUrl}/api/web/inventario/auth/admin/login`,
  //     guardia: `${environment.apiUrl}/api/web/inventario/auth/guardia/login`,
  //   },
  //   rolesPermitidos: ['Admin', 'Supervisor'],
  //   rutaBase:    '/private/inventario-web',
  //   activo:      true,
  // },
];