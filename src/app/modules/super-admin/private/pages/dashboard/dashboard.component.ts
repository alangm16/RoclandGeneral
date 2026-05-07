// src/app/modules/super-admin/pages/dashboard/dashboard.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../../../core/auth/auth.service';
import { LayoutService } from '../../../../../core/services/layout.service';

@Component({
  selector: 'app-superadmin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: [] // Puedes crear este archivo o dejarlo vacío
})
export class DashboardComponent implements OnInit {
  public readonly authSvc = inject(AuthService);
  private readonly layoutSvc = inject(LayoutService);

  readonly miNombre = this.authSvc.nombreUsuario;
  readonly miRol = this.authSvc.rolActual;

  // Estos datos luego vendrán de un SuperAdminService (API)
  kpis = {
    usuariosTotales: 145,
    usuariosActivosHoy: 82,
    proyectosInstalados: 3,
    alertasSeguridad: 0
  };

  ngOnInit(): void {
    // Configuramos el header usando tu servicio de Layout
    this.layoutSvc.setSubheader({
      title: 'Visión Global',
      showSearch: false,
      showAddButton: false
    });
  }
}