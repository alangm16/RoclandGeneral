// private-layout.component.ts
// Rocland — Layout base para todos los paneles privados
// Sprint 4: implementa el shell de _AdminLayout.cshtml en Angular

import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-private-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './private-layout.component.html',
  styleUrl:    './private-layout.component.scss',
})
export class PrivateLayoutComponent implements OnInit, OnDestroy {

  private readonly auth       = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);

  // ── Estado del sidebar ────────────────────────────────────────
  sidebarColapsado = signal(false);

  // ── Reloj ─────────────────────────────────────────────────────
  horaActual = signal('');
  private clockInterval?: ReturnType<typeof setInterval>;

  // ── Sesión actual ─────────────────────────────────────────────
  readonly nombreUsuario  = this.auth.nombreUsuario;
  readonly proyectoNombre = signal(this.auth.sesion()?.proyectoNombre ?? '');
  readonly rolActual      = this.auth.rolActual;

  // ── Items de navegación ───────────────────────────────────────
  // Se generan dinámicamente basados en el proyecto activo.
  // Sprint 5: estos vendrán de un servicio de menú por proyecto/rol.
  readonly navItems = signal(this.buildNavItems());

  private buildNavItems() {
    const proyectoId = this.auth.proyectoActual();
    const base       = `/private/${proyectoId}`;

    // Menú del módulo AccesoControl (migrado de _AdminLayout.cshtml)
    if (proyectoId === 'acceso-control-web') {
      return [
        { label: 'Dashboard',  icono: 'bi-speedometer2',  ruta: `${base}/dashboard`  },
        { label: 'Historial',  icono: 'bi-clock-history',  ruta: `${base}/historial`  },
        { label: 'Personas',   icono: 'bi-people-fill',    ruta: `${base}/personas`   },
        { label: 'Catálogos',  icono: 'bi-folder2-open',   ruta: `${base}/catalogos`  },
        { label: 'Guardias',   icono: 'bi-shield-fill',    ruta: `${base}/guardias`   },
      ];
    }

    // Plantilla para futuros proyectos
    // if (proyectoId === 'inventario-web') { return [...] }

    return [];
  }

  // ── Lifecycle ─────────────────────────────────────────────────
  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Restaurar estado del sidebar desde localStorage
    const guardado = localStorage.getItem('rocland_sidebar_collapsed');
    if (guardado === 'true') this.sidebarColapsado.set(true);

    // Iniciar reloj
    this.tickClock();
    this.clockInterval = setInterval(() => this.tickClock(), 1000);
  }

  ngOnDestroy(): void {
    clearInterval(this.clockInterval);
  }

  // ── Sidebar ───────────────────────────────────────────────────
  toggleSidebar(): void {
    const nuevoEstado = !this.sidebarColapsado();
    this.sidebarColapsado.set(nuevoEstado);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('rocland_sidebar_collapsed', String(nuevoEstado));
    }
  }

  cerrarSidebarEnMovil(): void {
    if (isPlatformBrowser(this.platformId) && window.innerWidth <= 768) {
      this.sidebarColapsado.set(true);
      localStorage.setItem('rocland_sidebar_collapsed', 'true');
    }
  }

  // ── Reloj ─────────────────────────────────────────────────────
  private tickClock(): void {
    this.horaActual.set(
      new Date().toLocaleTimeString('es-MX', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      })
    );
  }

  // ── Logout ────────────────────────────────────────────────────
  logout(): void {
    this.auth.logout();
  }

  readonly year = new Date().getFullYear();
}