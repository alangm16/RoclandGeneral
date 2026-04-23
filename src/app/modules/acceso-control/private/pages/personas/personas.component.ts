import { Component, OnInit, OnDestroy, inject, signal, computed, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { LayoutService } from '../../../../../core/services/layout.service';
import { AdminService } from '../../../services/admin.service';
import { PersonaResumen, PersonaPerfil, HistorialPersonaItem } from '../../../models/admin.models';
import { DataTableColumn, DataTableComponent } from '../../../../../shared/components/data-table/data-table.component';
import { ModalComponent } from '../../../../../shared/components/modal/modal.component';
import { BadgeComponent } from '../../../../../shared/components/badge/badge-component';

@Component({
  selector: 'app-personas',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatMenuModule,
    ModalComponent,
    DataTableComponent,
    BadgeComponent
  ],
  templateUrl: './personas.component.html',
  styleUrls: ['./personas.component.scss'],
})
export class PersonasComponent implements OnInit, OnDestroy {
  public readonly layoutSvc = inject(LayoutService);
  private readonly adminSvc = inject(AdminService);
  private readonly injector = inject(Injector);
  private readonly destroy$ = new Subject<void>();

  // ── Estado de la Tabla ──
  personas = signal<PersonaResumen[]>([]);
  totalPersonas = signal(0);
  cargando = signal(false);

  // ── Paginación ──
  paginaActual = signal(1);
  readonly porPagina = 10;
  totalPaginas = computed(() => Math.max(1, Math.ceil(this.totalPersonas() / this.porPagina)));

  // ── Estado del Modal ──
  perfilSeleccionado = signal<PersonaPerfil | null>(null);
  historialPersona = signal<HistorialPersonaItem[]>([]);
  cargandoDetalle = signal(false);
  mostrarModal = signal(false);

  ngOnInit(): void {
    this.layoutSvc.setSubheader({
      title: 'Personas',
      showSearch: true,
      searchPlaceholder: 'Buscar por nombre o número de ID...',
      actions: [
        {
          label: 'Buscar',
          icon: 'bi-search',
          variant: 'flat' as const,
          color: 'primary',
          handler: () => {
            this.paginaActual.set(1);
            this.cargarPersonas();
          },
        },
        {
          label: 'Limpiar',
          icon: 'bi-arrow-counterclockwise',
          variant: 'stroked' as const,
          handler: () => this.limpiarBusqueda(),
        },
      ],
    });

    toObservable(this.layoutSvc.searchValue, { injector: this.injector })
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        this.paginaActual.set(1);
        this.cargarPersonas();
      });

    this.cargarPersonas();
  }

  limpiarBusqueda(): void {
    this.layoutSvc.onSearchInput('');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.layoutSvc.resetSubheader();
  }

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
        error: () => this.cargando.set(false),
      });
  }

  async abrirDetalles(persona: PersonaResumen): Promise<void> {
    this.mostrarModal.set(true);
    this.cargandoDetalle.set(true);
    this.perfilSeleccionado.set(null);
    this.historialPersona.set([]);
    try {
      const [perfil, historial] = await Promise.all([
        this.adminSvc.getPerfilPersona(persona.id).toPromise(),
        this.adminSvc.getHistorialPersona(persona.id).toPromise(),
      ]);

      this.perfilSeleccionado.set(perfil ?? null);
      this.historialPersona.set(historial ?? []);
    } catch (e) {
      console.error('Error cargando detalles', e);
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
    return iso
      ? new Date(iso).toLocaleString('es-MX', {
          day: '2-digit', month: '2-digit', year: '2-digit',
          hour: '2-digit', minute: '2-digit',
        })
      : '—';
  }

  estadoAccesoBadge(estado?: string) {
    const map: Record<string, { cls: string; label: string }> = {
      'Aprobado':   { cls: 'bd badge--green', label: 'Aprobado' },
      'Rechazado':  { cls: 'bd badge--red',   label: 'Rechazado' },
      'Pendiente':  { cls: 'bd badge--amber', label: 'Pendiente' },
      'Sin salida': { cls: 'bd badge--amber', label: 'Sin salida' },
    };

    return map[estado ?? ''] ?? { cls: 'bd badge--gray', label: estado ?? '—' };
  }

  readonly tableColumns: DataTableColumn[] = [
  { key: 'indice',         label: '#',              headerClass: 'text-mono', cellClass: 'text-mono text-muted' },
  { key: 'nombre',         label: 'Nombre',         headerClass: '' },
  { key: 'numeroIdentificacion', label: 'No. ID',   headerClass: '', cellClass: 'text-mono' },
  { key: 'tipoID',         label: 'Tipo ID',        headerClass: '' },
  { key: 'empresa',        label: 'Empresa',        headerClass: '', cellClass: 'text-muted' },
  { key: 'visitas',        label: 'Visitas',        headerClass: '' },
  { key: 'ultimaVisita',   label: 'Última Visita',  headerClass: '', cellClass: 'text-mono text-muted' },
  { key: 'acciones',       label: '',               headerClass: 'w-50' }  // estilo width
];
}