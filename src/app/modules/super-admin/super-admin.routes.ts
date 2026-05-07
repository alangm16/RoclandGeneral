// src/app/modules/super-admin/super-admin.routes.ts
import { Routes } from '@angular/router';
import { DashboardComponent } from '../super-admin/private/pages/dashboard/dashboard.component';
// import { UsuariosComponent } from './pages/usuarios/usuarios.component';
// import { ProyectosComponent } from './pages/proyectos/proyectos.component';

export const SUPER_ADMIN_ROUTES: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  // { path: 'usuarios', component: UsuariosComponent },
  // { path: 'proyectos', component: ProyectosComponent }
];