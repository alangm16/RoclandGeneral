// src/app/modules/acceso-control/public/acceso-public.routes.ts
import { Routes } from '@angular/router';
import { AccesoSelectorComponent } from './pages/acceso-selector/acceso-selector.component';
import { VisitanteFormComponent }  from './pages/visitante-form/visitante-form.component';
import { ProveedorFormComponent }    from './pages/proveedor-form/proveedor-form.component';
import { ConfirmacionComponent }    from './pages/confirmacion/confirmacion.component';
import { AvisoPrivacidadComponent } from './pages/aviso-privacidad/aviso-privacidad.component';

export const ACCESO_PUBLIC_ROUTES: Routes = [
  {
    path: '',
    component: AccesoSelectorComponent,
    title: 'Selección de Acceso — Rocland',
  },
  {
    path: 'aviso-privacidad',
    component: AvisoPrivacidadComponent,
    title: 'Aviso de Privacidad — Rocland',
  },
  {
    path: 'confirmacion',
    component: ConfirmacionComponent,
    title: 'Solicitud Enviada — Rocland',
  },
  {
    path: 'formularios', // 3er Nivel: Agrupador de formularios
    children: [
      {
        path: 'visitante', // 4to Nivel: Acción específica
        component: VisitanteFormComponent,
        title: 'Registro de Visitante — Rocland',
      },
      {
        path: 'proveedor',
        component: ProveedorFormComponent,
        title: 'Registro de Proveedor — Rocland',
      },
      {
        path: '',
        redirectTo: 'visitante',
        pathMatch: 'full'
      }
    ],
  },
];