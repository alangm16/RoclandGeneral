// sidebar.component.ts
import { Component, inject, signal, computed, effect } from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../../core/auth/auth.service';
import { environment } from '../../../../../environments/Environment';
import { VistaMenu } from '../../../../core/auth/auth.models';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  private readonly authService = inject(AuthService);
  private readonly http         = inject(HttpClient);
  private readonly router       = inject(Router);
  private readonly proyectoCodigo = computed(() => this.authService.proyectoActivo()?.codigo ?? '');

  menuItems    = signal<VistaMenu[]>([]);
  gruposAbiertos = signal<Set<number>>(new Set());
  
  private readonly proyectoId = computed(
    () => this.authService.sesion()?.proyectoActivo?.id ?? 0
  );

  readonly userName = computed(() => this.authService.nombreUsuario());
  readonly userRole = computed(() => {
    const proyecto = this.authService.proyectoActivo();
    return proyecto?.rolEnProyecto ?? '';
  });

  constructor() {
    // Recargar menú cuando cambie el proyecto activo
    effect(() => {
      const id = this.proyectoId();
      if (id > 0) this.cargarMenu(id);
      else        this.menuItems.set([]);
    });

    // Auto-expandir grupos cuando se navega (incluye carga inicial)
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.expandirGruposActivos());
  }

  // ── Carga de menú ──────────────────────────────────────────────────
  private cargarMenu(proyectoId: number): void {
    const token = this.authService.getToken();
    if (!token) return;

    this.http
      .get<VistaMenu[]>(`${environment.apiUrl}/api/superadmin/menu/${proyectoId}`)
      .subscribe(items => {
        this.menuItems.set(items);
        // Después de cargar, expandir los grupos que coincidan con la ruta actual
        this.expandirGruposActivos();
      });
  }

  // ── Toggle de grupos ────────────────────────────────────────────────
  toggleGrupo(id: number): void {
    this.gruposAbiertos.update(set => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else              next.add(id);
      return next;
    });
  }

  // ── Auto-expansión basada en la URL actual ──────────────────────────
  private expandirGruposActivos(): void {
    const url = this.router.url;
    const idsAAbrir = new Set<number>();

    const revisarNivel = (items: VistaMenu[]): boolean => {
      let alguienActivo = false;
      for (const item of items) {
        if (item.esContenedor) {
          const hijoActivo = revisarNivel(item.hijos);
          if (hijoActivo) {
            idsAAbrir.add(item.id);
            alguienActivo = true;
          }
        } else {
          if (url.includes(item.ruta)) alguienActivo = true;
        }
      }
      return alguienActivo;
    };

    revisarNivel(this.menuItems());
    // Fusionar con los grupos que el usuario abrió manualmente
    this.gruposAbiertos.update(set => new Set([...set, ...idsAAbrir]));
  }

  // ── Helpers ─────────────────────────────────────────────────────────
  isActivo(item: VistaMenu): boolean {
    const url = this.router.url;
    const revisarHijos = (hijos: VistaMenu[]): boolean =>
      hijos.some(h => h.esContenedor ? revisarHijos(h.hijos) : url.includes(h.ruta));
    return item.esContenedor ? revisarHijos(item.hijos) : url.includes(item.ruta);
  }

  getRuta(item: VistaMenu): string {
    const base = `/private/${this.proyectoCodigo()}`;
    // normaliza: quita barras repetidas y barra final, luego asegura que empiece con '/'
    const rutaLimpia = (item.ruta || '').replace(/\/+/g, '/').replace(/\/$/, '');
    const rutaNormalizada = rutaLimpia.startsWith('/') ? rutaLimpia : `/${rutaLimpia}`;
    return `${base}${rutaNormalizada}`;
  }

  logout(): void {
    this.authService.logout();
  }
}