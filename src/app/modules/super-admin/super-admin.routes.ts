// super-admin.routes.ts
// Rutas alineadas al sidebar:  /private/super-admin/<ruta>
// Todas las rutas coinciden exactamente con el campo `Ruta` del seed SQL
// (sin el prefijo /private/super-admin, que viene del router parent).

import { Routes } from '@angular/router';
import { PrivateLayoutComponent } from '../../layouts/private-layout/private-layout.component';

export const SUPER_ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: PrivateLayoutComponent,
    data: { proyectoCodigo: 'super-admin' },
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

      // ── Dashboard por Proyecto ─────────────────── /dashboard/proyecto/:id
      {
        path: 'dashboard/proyecto/:id',
        loadComponent: () =>
          import('./private/pages/dashboard/dashboard-proyecto/dashboard-proyecto.component')
            .then(m => m.DashboardProyectoComponent),
      },

      // ── Usuarios ─────────────────────────────────────────────── /usuarios/*
      {
        path: 'usuarios',
        loadComponent: () =>
          import('./private/pages/usuarios/usuarios.component')
            .then(m => m.UsuariosComponent),
      },
      {
        path: 'usuarios/detalle/:id',
        loadComponent: () =>
          import('./private/pages/usuarios/detalle-usuario/detalle-usuario.component')
            .then(m => m.DetalleUsuarioComponent),
      },

      // ── Proyectos ─────────────────────────────────────────────── /proyectos/*
      {
        path: 'proyectos/listado',
        loadComponent: () =>
          import('./private/pages/proyectos/proyectos.component')
            .then(m => m.ProyectosComponent),
      },
      {
        // Configuración
        path: 'proyectos/configuracion/:id',
        loadComponent: () =>
          import('./private/pages/proyectos/configuracion/conf-proyectos.component')
            .then(m => m.ConfiguracionProyectoComponent),
      },
      {
        // Usuarios del Proyecto → /proyectos/usuarios
        path: 'proyectos/usuarios',
        loadComponent: () =>
          import('./private/pages/proyectos/usuarios/usuarios-proyecto.component')
            .then(m => m.UsuariosProyectoComponent),
      },

      // // ── Control de Accesos ──────────────────── /control-accesos/vistas-usuario
      // {
      //   path: 'control-accesos/vistas-usuario',
      //   loadComponent: () =>
      //     import('./private/pages/control-accesos/vistas-usuario.component')
      //       .then(m => m.VistasUsuarioComponent),
      // },

      // // ── SuperAdmin ──────────────────────────────────────── /superadmin/*
      // {
      //   path: 'superadmin/roles',
      //   loadComponent: () =>
      //     import('./private/pages/superadmin/roles-sa/roles-sa.component')
      //       .then(m => m.RolesSAComponent),
      // },
      // {
      //   path: 'superadmin/usuarios',
      //   loadComponent: () =>
      //     import('./private/pages/superadmin/usuarios-sa/usuarios-sa.component')
      //       .then(m => m.UsuariosSAComponent),
      // },

      // // ── Seguridad ────────────────────────────────────────── /seguridad/*
      // {
      //   path: 'seguridad/logs',
      //   loadComponent: () =>
      //     import('./private/pages/seguridad/logs/logs.component')
      //       .then(m => m.LogsComponent),
      // },
      // {
      //   path: 'seguridad/sesiones',
      //   loadComponent: () =>
      //     import('./private/pages/seguridad/sesiones/sesiones.component')
      //       .then(m => m.SesionesComponent),
      // },

      // // ── Alertas ──────────────────────────────────────────── /alertas
      // {
      //   path: 'alertas',
      //   loadComponent: () =>
      //     import('./private/pages/alertas/alertas.component')
      //       .then(m => m.AlertasComponent),
      // },

      // // ── Auditoría ─────────────────────────────────────────── /auditoria
      // {
      //   path: 'auditoria',
      //   loadComponent: () =>
      //     import('./private/pages/auditoria/auditoria.component')
      //       .then(m => m.AuditoriaComponent),
      // },

      // // ── Configuración ─────────────────────────────────────── /configuracion
      // {
      //   path: 'configuracion',
      //   loadComponent: () =>
      //     import('./private/pages/configuracion/configuracion.component')
      //       .then(m => m.ConfiguracionComponent),
      // },

      // Wildcard — cualquier ruta desconocida vuelve al dashboard
      { path: '**', redirectTo: 'dashboard' },
    ],
  },
];