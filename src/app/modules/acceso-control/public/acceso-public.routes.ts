// import { Routes } from '@angular/router';
// import { VisitanteFormComponent } from './pages/visitante-form/visitante-form.component';

// export const ACCESO_PUBLIC_ROUTES: Routes = [
//   { 
//     path: 'formularios', // 3er nivel: Agrupador de formularios
//     children: [
//       { path: 'visitante', component: VisitanteFormComponent }, // 4to nivel: Pantalla final
//       // { path: 'proveedor', component: ProveedorFormComponent },
//     ]
//   },
//   // Si alguien entra a /public/acceso-control-web a secas, lo mandamos al de visitante
//   { path: '', redirectTo: 'formularios/visitante', pathMatch: 'full' }
// ];

// acceso-public.routes.ts
import { Routes } from '@angular/router';
import { AccesoSelectorComponent } from './pages/acceso-selector/acceso-selector.component';
import { VisitanteFormComponent }  from './pages/visitante-form/visitante-form.component';
import { ConfirmacionComponent }   from './pages/confirmacion/confirmacion.component';
import { AvisoPrivacidadComponent } from './pages/aviso-privacidad/aviso-privacidad.component';

export const ACCESO_PUBLIC_ROUTES: Routes = [
  {
    path: '',
    component: AccesoSelectorComponent,
  },
  {
    path: 'visitante',
    component: VisitanteFormComponent,
    title: 'Registro de Visitante — Rocland',
  },
  {
    path: 'confirmacion',
    component: ConfirmacionComponent,
    title: 'Solicitud Enviada — Rocland',
  },
  {
    path: 'aviso-privacidad',
    component: AvisoPrivacidadComponent,
    title: 'Aviso de Privacidad — Rocland',
  },
  // Sprint 3: Proveedor
  // {
  //   path: 'proveedor',
  //   component: ProveedorFormComponent,
  //   title: 'Registro de Proveedor — Rocland',
  // },
];