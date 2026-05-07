// src/app/modules/super-admin/super-admin.routes.ts
import { Routes } from '@angular/router';
import { PrivateLayoutComponent } from '../../layouts/private-layout/private-layout.component';
import { DashboardComponent } from './private/pages/dashboard/dashboard.component';
// import { UsuariosComponent } from './private/pages/usuarios/usuarios.component';

export const SUPER_ADMIN_ROUTES: Routes = [
  {
    path: '', 
    component: PrivateLayoutComponent, 
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      // { path: 'usuarios', component: UsuariosComponent },
    ]
  }
];