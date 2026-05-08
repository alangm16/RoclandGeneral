// super-admin.routes.ts
// Rocland — Super Admin | Todas las vistas del módulo

import { Routes } from '@angular/router';
import { PrivateLayoutComponent } from '../../layouts/private-layout/private-layout.component';

export const SUPER_ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: PrivateLayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

      // ── 1. Dashboard ─────────────────────────────────────────────
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./private/pages/dashboard/dashboard.component')
            .then(m => m.DashboardComponent),
      },

      // ── 2. Directorio Global (Usuarios) ──────────────────────────
      // Lista paginada de todos los usuarios del sistema.
      // Alta, baja, edición, reset de password, asignación de roles.
      // {
      //   path: 'usuarios',
      //   loadComponent: () =>
      //     import('./private/pages/usuarios/usuarios.component')
      //       .then(m => m.UsuariosComponent),
      // },

      // ── 3. Catálogo de Módulos (Proyectos + Vistas) ──────────────
      // Grid de proyectos con filtros por plataforma.
      // CRUD de proyectos y constructor visual de menú (vistas).
      // {
      //   path: 'modulos',
      //   loadComponent: () =>
      //     import('./private/pages/modulos/modulos.component')
      //       .then(m => m.ModulosComponent),
      // },

      // ── 4. Matriz de Permisos ─────────────────────────────────────
      // Buscar usuario → ver/editar permisos granulares por módulo y vista.
      // Buscar rol → editar permisos del rol (afecta a todos sus miembros).
      // {
      //   path: 'permisos',
      //   loadComponent: () =>
      //     import('./private/pages/permisos/permisos.component')
      //       .then(m => m.PermisosComponent),
      // },

      // ── 5. Roles ──────────────────────────────────────────────────
      // Lista de roles globales. Alta de roles, desactivar.
      // Desde aquí se puede ir a la matriz de permisos de un rol.
      // {
      //   path: 'roles',
      //   loadComponent: () =>
      //     import('./private/pages/roles/roles.component')
      //       .then(m => m.RolesComponent),
      // },

      // ── 6. Logs de Acceso ─────────────────────────────────────────
      // Tabla completa y paginada de TBL_ROCLAND_SUPERADMIN_LOGS_ACCESO.
      // Filtros: plataforma, resultado, usuario, rango de fechas.
      // Export Excel/PDF.
      // {
      //   path: 'logs',
      //   loadComponent: () =>
      //     import('./private/pages/logs/logs.component')
      //       .then(m => m.LogsComponent),
      // },

      // ── 7. Configuración / Variables de Entorno ───────────────────
      // Configuraciones globales del sistema:
      //   - Cierre de sesión por inactividad (minutos)
      //   - Intentos fallidos antes de bloqueo
      //   - Duración de bloqueo (minutos)
      //   - TTL de Refresh Token (días)
      //   - Notificaciones FCM habilitadas
      // {
      //   path: 'configuracion',
      //   loadComponent: () =>
      //     import('./private/pages/configuracion/configuracion.component')
      //       .then(m => m.ConfiguracionComponent),
      // },
    ],
  },
];