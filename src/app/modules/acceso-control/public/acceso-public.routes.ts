// src/app/modules/acceso-control/public/acceso-public.routes.ts

import { Routes } from '@angular/router';
import { PublicLayoutComponent } from '../../../layouts/public-layout/public-layout.component';

export const ACCESO_PUBLIC_ROUTES: Routes = [
  {
    path: '', 
    component: PublicLayoutComponent,
    children: [
      // Todas tus rutas públicas pasan a ser "hijas" del layout
      { 
        path: 'formularios/visitante', 
        loadComponent: () => import('./pages/visitante-form/visitante-form.component').then(m => m.VisitanteFormComponent) 
      },
      { 
        path: 'formularios/proveedor', 
        loadComponent: () => import('./pages/proveedor-form/proveedor-form.component').then(m => m.ProveedorFormComponent) 
      },
      { 
        path: 'acceso-selector', 
        loadComponent: () => import('./pages/acceso-selector/acceso-selector.component').then(m => m.AccesoSelectorComponent) 
      },
      { 
        path: 'aviso-privacidad', 
        loadComponent: () => import('./pages/aviso-privacidad/aviso-privacidad.component').then(m => m.AvisoPrivacidadComponent) 
      },
      { 
        path: 'confirmacion', 
        loadComponent: () => import('./pages/confirmacion/confirmacion.component').then(m => m.ConfirmacionComponent) 
      },
      // Redirección por defecto si entran a la raíz pública
      { 
        path: '', 
        redirectTo: 'acceso-selector', 
        pathMatch: 'full' 
      }
    ]
  }
];