import { Routes } from '@angular/router';
import { PublicLayoutComponent } from './layouts/public-layout/public-layout.component';

export const routes: Routes = [
  {
    path: 'public', // 1er nivel: Todo lo que sea público
    component: PublicLayoutComponent,
    children: [
      {
        path: 'acceso-control-web', // 2do nivel: El módulo al que pertenece
        loadChildren: () => import('./modules/acceso-control/public/acceso-public.routes').then(m => m.ACCESO_PUBLIC_ROUTES)
      }
      // En el futuro aquí podrías agregar:
      // { path: 'otro-modulo', loadChildren: ... }
    ]
  },
  {
    path: 'admin', // Panel de administración privado
    // component: PrivateLayoutComponent,
    children: [] 
  },
  // Redirección por defecto si el usuario entra a localhost:4200 sin ruta
  { path: '', redirectTo: 'public/acceso-control-web/formularios/visitante', pathMatch: 'full' },
  // Fallback si la ruta no existe (404)
  { path: '**', redirectTo: 'public/acceso-control-web/formularios/visitante' }
];