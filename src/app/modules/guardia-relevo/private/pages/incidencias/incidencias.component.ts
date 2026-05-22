import {
  Component, OnInit, OnDestroy, inject, signal, computed,
  Injector
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, combineLatest, firstValueFrom } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';
import { LayoutService } from '../../../../../core/services/layout.service';
import { GuardiaRelevoService } from '../../../services/guardia-relevo.service';
import { AlertService } from '../../../../../shared/components/swal-alert/alert.service';
import {
  DataTableComponent,
  DataTableColumn,
} from '../../../../../shared/components/data-table/data-table.component';
import { BadgeComponent } from '../../../../../shared/components/badge/badge-component';
import { ModalComponent } from '../../../../../shared/components/modal/modal.component';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import {
  IncidenciaListResponse,
  IncidenciaResponse,
  FiltrarIncidenciasRequest,
  ResolverIncidenciaRequest,
  ChecklistPuntoItem,
} from '../../../models/guardia-relevo.models';

@Component({
  selector: 'app-guardia-relevo-incidencias',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DataTableComponent,
    BadgeComponent,
    ModalComponent,
    MatMenuModule,
    MatDividerModule,
  ],
  templateUrl: './incidencias.component.html',
  styleUrls: ['./incidencias.component.scss'],
})
export class IncidenciasComponent implements OnInit, OnDestroy {
  private layoutSvc = inject(LayoutService);
  private grService = inject(GuardiaRelevoService);
  private alert = inject(AlertService);
  private injector = inject(Injector);
  private destroy$ = new Subject<void>();

  // ── Datos de la tabla ──
  incidencias = signal<IncidenciaListResponse[]>([]);
  totalRegistros = signal(0);
  cargando = signal(false);
  paginaActual = signal(1);
  readonly porPagina = 15;
  totalPaginas = computed(() => Math.max(1, Math.ceil(this.totalRegistros() / this.porPagina)));

  // ── Columnas de la tabla ──
  columnas: DataTableColumn[] = [
    { key: 'fechaRelevo', label: 'FECHA', cellClass: 'text-mono' },
    { key: 'nombrePunto', label: 'PUNTO' },
    { key: 'tipoOrigen', label: 'TIPO' },
    { key: 'estado', label: 'ESTADO', cellClass: 'text-center' },
    { key: 'acciones', label: '', cellClass: 'text-end' },
  ];

  // ── Opciones para filtros dinámicos ──
  puntosOptions = signal<{ label: string; value: string }[]>([]);

  // ── Modal de detalle ──
  modalDetalleAbierto = signal(false);
  incidenciaDetalle = signal<IncidenciaResponse | null>(null);
  cargandoDetalle = signal(false);

  // ── Modal de resolución ──
  modalResolverAbierto = signal(false);
  incidenciaResolverId = signal<number | null>(null);
  resolverNota = signal('');
  resolverPorId = signal<number | null>(null);
  perfilesDisponibles = signal<{ id: number; nombre: string }[]>([]);

  ngOnInit(): void {
    this.layoutSvc.setSubheader({
      title: 'Incidencias',
      showSearch: true,
      searchPlaceholder: 'Buscar por punto, descripción...',
      filters: [
        { type: 'date', key: 'fechaDesde', placeholder: 'Fecha desde' },
        { type: 'date', key: 'fechaHasta', placeholder: 'Fecha hasta' },
        {
          type: 'select',
          key: 'tipoOrigen',
          placeholder: 'Todos los tipos',
          options: [
            { label: 'No OK', value: 'NoOk' },
            { label: 'Discrepancia', value: 'Discrepancia' },
          ],
        },
        {
          type: 'select',
          key: 'estado',
          placeholder: 'Todos los estados',
          options: [
            { label: 'Abierta', value: 'Abierta' },
            { label: 'Resuelta', value: 'Resuelta' },
          ],
        },
        {
          type: 'select',
          key: 'puntoId',
          placeholder: 'Todos los puntos',
          options: [], // se llenará dinámicamente
        },
      ],
      actions: [
        { label: 'Buscar', icon: 'bi-search', variant: 'flat', handler: () => this.ejecutarBusqueda() },
        { label: 'Limpiar', icon: 'bi-arrow-counterclockwise', variant: 'stroked', handler: () => this.limpiarFiltros() },
      ],
    });

    this.cargarOpcionesPuntos();
    this.cargarIncidencias();
    this.setupFiltros();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.layoutSvc.resetSubheader();
  }

  private cargarOpcionesPuntos(): void {
    this.grService.getChecklistPuntosActivos().subscribe({
      next: (puntos) => {
        const opts = puntos.map(p => ({ label: `${p.categoria} - ${p.nombre}`, value: p.id.toString() }));
        this.puntosOptions.set(opts);
        const currentFilters = this.layoutSvc.subheaderFilters();
        const idx = currentFilters.findIndex(f => f.key === 'puntoId');
        if (idx !== -1) {
          const updated = [...currentFilters];
          updated[idx] = { ...updated[idx], options: opts };
          this.layoutSvc.subheaderFilters.set(updated);
        }
      },
      error: () => console.error('Error cargando puntos para filtro'),
    });
  }

  private setupFiltros(): void {
    combineLatest([
      toObservable(this.layoutSvc.searchValue, { injector: this.injector }),
      toObservable(this.layoutSvc.filterValues, { injector: this.injector }),
    ])
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.paginaActual.set(1);
        this.cargarIncidencias();
      });
  }

  private cargarIncidencias(): void {
    this.cargando.set(true);
    const filtros: FiltrarIncidenciasRequest = {
      page: this.paginaActual(),
      pageSize: this.porPagina,
      fechaDesde: this.layoutSvc.filterValues()['fechaDesde'] || undefined,
      fechaHasta: this.layoutSvc.filterValues()['fechaHasta'] || undefined,
      tipoOrigen: this.layoutSvc.filterValues()['tipoOrigen'] || undefined,
      estado: this.layoutSvc.filterValues()['estado'] || undefined,
      puntoId: this.layoutSvc.filterValues()['puntoId'] ? +this.layoutSvc.filterValues()['puntoId'] : undefined,
    };
    // Búsqueda global (si el backend la soporta, se puede añadir)
    // Por ahora, usamos solo los filtros.

    this.grService
      .getIncidenciasPaginadas(filtros)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.incidencias.set(res.items);
          this.totalRegistros.set(res.totalCount);
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.alert.error('No se pudieron cargar las incidencias');
        },
      });
  }

  cambiarPagina(delta: number): void {
    const nueva = this.paginaActual() + delta;
    if (nueva >= 1 && nueva <= this.totalPaginas()) {
      this.paginaActual.set(nueva);
      this.cargarIncidencias();
    }
  }

  ejecutarBusqueda(): void {
    this.paginaActual.set(1);
    this.cargarIncidencias();
  }

  limpiarFiltros(): void {
    this.layoutSvc.searchValue.set('');
    this.layoutSvc.filterValues.set({});
    this.paginaActual.set(1);
    this.cargarIncidencias();
  }

  // ── Modal de detalle ──
  async verDetalle(incidenciaId: number): Promise<void> {
    this.modalDetalleAbierto.set(true);
    this.cargandoDetalle.set(true);
    try {
      const detalle = await firstValueFrom(this.grService.getIncidenciaDetalle(incidenciaId));
      this.incidenciaDetalle.set(detalle);
    } catch (error) {
      this.alert.error('No se pudo cargar el detalle de la incidencia');
    } finally {
      this.cargandoDetalle.set(false);
    }
  }

  cerrarModalDetalle(): void {
    this.modalDetalleAbierto.set(false);
    this.incidenciaDetalle.set(null);
  }

  // ── Modal de resolución ──
  async abrirModalResolver(incidenciaId: number): Promise<void> {
    // Verificar que la incidencia esté abierta (doble control)
    const incidencia = this.incidencias().find(i => i.id === incidenciaId);
    if (incidencia?.estado === 'Resuelta') {
      this.alert.error('La incidencia ya está resuelta');
      return;
    }
    this.incidenciaResolverId.set(incidenciaId);
    this.resolverNota.set('');
    this.resolverPorId.set(null);
    try {
      const perfiles = await firstValueFrom(this.grService.getPerfilesActivos());
      this.perfilesDisponibles.set(perfiles?.map(p => ({ id: p.id, nombre: p.nombreCompleto })) ?? []);
      this.modalResolverAbierto.set(true);
    } catch (error) {
      this.alert.error('No se pudieron cargar los guardias');
    }
  }

  async confirmarResolver(): Promise<void> {
    const id = this.incidenciaResolverId();
    const nota = this.resolverNota();
    const resueltaPorId = this.resolverPorId();
    if (!id || !nota.trim()) {
      this.alert.error('Debes escribir una nota de resolución');
      return;
    }
    if (!resueltaPorId) {
      this.alert.error('Selecciona el responsable de la resolución');
      return;
    }
    const dto: ResolverIncidenciaRequest = { resueltaPorId, notaResolucion: nota };
    this.grService.resolverIncidencia(id, dto).subscribe({
      next: () => {
        this.alert.exito('Incidencia resuelta correctamente');
        this.modalResolverAbierto.set(false);
        this.cargarIncidencias(); // refrescar lista
      },
      error: () => this.alert.error('No se pudo resolver la incidencia'),
    });
  }

  // ── Helper para badge de estado ──
  getEstadoVariant(estado: string): string {
    return estado === 'Abierta' ? 'red' : 'green';
  }

  getTipoVariant(tipo: string): string {
    return tipo === 'NoOk' ? 'red' : 'amber';
  }

  // ── Helper para formatear fecha ──
  formatFecha(fecha: string): string {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleDateString('es-MX');
  }
}