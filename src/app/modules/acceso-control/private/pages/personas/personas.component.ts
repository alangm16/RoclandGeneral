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
    BadgeComponent,
  ],
  templateUrl: './personas.component.html',
  styleUrls: ['./personas.component.scss'],
})
export class PersonasComponent implements OnInit, OnDestroy {
  public readonly layoutSvc = inject(LayoutService);
  private readonly adminSvc  = inject(AdminService);
  private readonly injector  = inject(Injector);
  private readonly destroy$  = new Subject<void>();

  // ── Tabla ──
  personas      = signal<PersonaResumen[]>([]);
  totalPersonas = signal(0);
  cargando      = signal(false);

  // ── Paginación ──
  paginaActual = signal(1);
  readonly porPagina = 10;
  totalPaginas = computed(() => Math.max(1, Math.ceil(this.totalPersonas() / this.porPagina)));

  // ── Modal ──
  perfilSeleccionado = signal<PersonaPerfil | null>(null);
  historialPersona   = signal<HistorialPersonaItem[]>([]);
  cargandoDetalle    = signal(false);
  mostrarModal       = signal(false);

  // ── Columnas ──
  readonly tableColumns: DataTableColumn[] = [
    { key: 'indice',               label: '#',             headerClass: 'col-index',   cellClass: 'text-mono text-muted col-index' },
    { key: 'nombre',               label: 'Nombre',        headerClass: 'col-nombre',  cellClass: 'col-nombre' },
    { key: 'numeroIdentificacion', label: 'No. ID',        headerClass: 'col-id',      cellClass: 'text-mono col-id' },
    { key: 'tipoID',               label: 'Tipo ID',       headerClass: 'col-tipo',    cellClass: 'col-tipo' },
    { key: 'empresa',              label: 'Empresa',       headerClass: 'col-empresa', cellClass: 'text-muted col-empresa' },
    { key: 'visitas',              label: 'Visitas',       headerClass: 'col-visitas', cellClass: 'col-visitas' },
    { key: 'ultimaVisita',         label: 'Última Visita', headerClass: 'col-fecha',   cellClass: 'text-mono text-muted col-fecha' },
    { key: 'acciones',             label: '',              headerClass: 'col-actions', cellClass: 'col-actions' },
  ];

  // ── Datos mapeados para la tabla ──
  readonly tableData = computed(() =>
    this.personas().map((p, i) => ({
      ...p,
      indice:      (this.paginaActual() - 1) * this.porPagina + i + 1,
      visitas:     p.totalVisitas,
      ultimaVisita: p.fechaUltimaVisita,
      _raw: p,
    }))
  );

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
    // Asegurar que el sidenav quede restaurado si el componente se destruye con modal abierto
    this.layoutSvc.closeModal();
  }

  limpiarBusqueda(): void {
    this.layoutSvc.onSearchInput('');
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

  /**
   * 1. Cierra el sidenav completamente y espera la animación.
   * 2. Muestra el modal y carga los datos en paralelo.
   */
  async abrirDetalles(persona: PersonaResumen): Promise<void> {
    await this.layoutSvc.openModal();

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

  /**
   * Cierra el modal y restaura el sidenav.
   */
  cerrarModal(): void {
    this.mostrarModal.set(false);
    this.layoutSvc.closeModal();
  }

  cambiarPagina(delta: number): void {
    const nueva = this.paginaActual() + delta;
    if (nueva >= 1 && nueva <= this.totalPaginas()) {
      this.paginaActual.set(nueva);
      this.cargarPersonas();
    }
  }
}