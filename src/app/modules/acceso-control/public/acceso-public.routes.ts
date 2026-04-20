import { Routes } from '@angular/router';
import { VisitanteFormComponent } from './pages/visitante-form/visitante-form.component';

export const ACCESO_PUBLIC_ROUTES: Routes = [
  { 
    path: 'formularios', // 3er nivel: Agrupador de formularios
    children: [
      { path: 'visitante', component: VisitanteFormComponent }, // 4to nivel: Pantalla final
      // { path: 'proveedor', component: ProveedorFormComponent },
    ]
  },
  // Si alguien entra a /public/acceso-control-web a secas, lo mandamos al de visitante
  { path: '', redirectTo: 'formularios/visitante', pathMatch: 'full' }
];