import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';

// Importaciones de Core y Servicios Propios
import { LayoutService } from '../../../../../core/services/layout.service';
import { AdminService } from '../../../services/admin.service';
import { PersonaResumen, PersonaPerfil, HistorialPersonaItem } from '../../../models/admin.models';

@Component({
  selector: 'app-personas',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatMenuModule],
  templateUrl: './personas.component.html',
  styleUrls: ['./personas.component.scss'],
})
export class PersonasComponent implements OnInit, OnDestroy {
  private readonly layoutSvc = inject(LayoutService);
  private readonly adminSvc = inject(AdminService);
  private readonly destroy$ = new Subject<void>();

  // ── Estado de la Tabla ──
  personas = signal<PersonaResumen[]>([]);
  totalPersonas = signal(0);
  cargando = signal(false);

  // ── Paginación ──
  paginaActual = signal(1);
  readonly porPagina = 10;
  totalPaginas = computed(() => Math.max(1, Math.ceil(this.totalPersonas() / this.porPagina)));

  // ── Estado del Modal/Panel de Detalles ──
  perfilSeleccionado = signal<PersonaPerfil | null>(null);
  historialPersona = signal<HistorialPersonaItem[]>([]);
  cargandoDetalle = signal(false);
  mostrarModal = signal(false);

  ngOnInit(): void {
    // Configurar el Subheader
    this.layoutSvc.setSubheader({
      title: 'Personas',
      showSearch: true,
      searchPlaceholder: 'Buscar por nombre o número de ID...',
      actions: [
        {
          label: 'Refrescar',
          icon: 'bi-arrow-clockwise',
          variant: 'stroked',
          handler: () => this.cargarPersonas()
        }
      ]
    });

    // Escuchar cambios en la barra de búsqueda del subheader
    toObservable(this.layoutSvc.searchValue)
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.paginaActual.set(1);
        this.cargarPersonas();
      });

    this.cargarPersonas();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.layoutSvc.resetSubheader(); 
  }

  // ── Peticiones usando AdminService ──
  cargarPersonas(): void {
    this.cargando.set(true);
    const busqueda = this.layoutSvc.searchValue().trim();

    this.adminSvc.getPersonas(this.paginaActual(), this.porPagina, busqueda)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.personas.set(res.items);
          this.totalPersonas.set(res.total);
          this.cargando.set(false);
        },
        error: () => this.cargando.set(false)
      });
  }

  async abrirDetalles(persona: PersonaResumen) {
    this.mostrarModal.set(true);
    this.cargandoDetalle.set(true);
    this.perfilSeleccionado.set(null);
    this.historialPersona.set([]);

    try {
      // Uso de Promesas para esperar ambas llamadas usando AdminService
      const [perfil, historial] = await Promise.all([
        this.adminSvc.getPerfilPersona(persona.id).toPromise(),
        this.adminSvc.getHistorialPersona(persona.id).toPromise()
      ]);
      
      this.perfilSeleccionado.set(perfil ?? null);
      this.historialPersona.set(historial ?? []);
    } catch (e) {
      console.error("Error cargando detalles", e);
    } finally {
      this.cargandoDetalle.set(false);
    }
  }

  cerrarModal(): void {
    this.mostrarModal.set(false);
  }

  cambiarPagina(delta: number): void {
    const nueva = this.paginaActual() + delta;
    if (nueva >= 1 && nueva <= this.totalPaginas()) {
      this.paginaActual.set(nueva);
      this.cargarPersonas();
    }
  }

  fmtFecha(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('es-MX', { 
      day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' 
    });
  }

  estadoBadge(estado: string): string {
    const m: Record<string, string> = { 
      Aprobado: 'badge-green', Salido: 'badge-green', Rechazado: 'badge-red', Pendiente: 'badge-amber' 
    };
    return m[estado] || 'badge-gray';
  }
}