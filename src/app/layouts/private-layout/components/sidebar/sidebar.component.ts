// src/app/layouts/private-layout/components/sidebar/sidebar.component.ts
import { Component, inject, computed } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { NgClass, CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterModule, MatListModule, NgClass, CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  private readonly authService = inject(AuthService);

  // Construimos el menú dinámicamente desde la sesión
  readonly menuItems = computed(() => {
    const sesion = this.authService.sesion();
    const proyecto = this.authService.proyectoActual();
    
    if (!sesion || !sesion.vistasPermitidas) return [];

    return sesion.vistasPermitidas.map(vista => ({
      label: vista.nombre,
      icon: vista.icono || 'bi-circle',
      // Construimos la ruta: /private/super-admin/usuarios
      route: `/private/${proyecto}/${vista.ruta}`
    }));
  });

  get userName() { return this.authService.nombreUsuario(); }
  get userRole() { return this.authService.rolActual(); }

  logout(): void { this.authService.logout(); }
}