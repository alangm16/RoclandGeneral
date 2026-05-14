import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  Injector,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, combineLatest } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';
import { LayoutService } from '../../../../../core/services/layout.service';
import { AdminService } from '../../../services/admin.service';
import {
  DataTableColumn,
  DataTableComponent,
} from '../../../../../shared/components/data-table/data-table.component';
import { BadgeComponent } from '../../../../../shared/components/badge/badge-component';
import { HistorialAccesoItemDto, HistorialPaginado } from '../../../models/admin.models';

// ─────────────────────────────────────────────────────────────────
@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [CommonModule, DataTableComponent, BadgeComponent],
  templateUrl: './historial.component.html',
  styleUrls: [],
})
export class HistorialComponent implements OnInit, OnDestroy {
  public readonly layoutSvc = inject(LayoutService);
  private readonly adminSvc = inject(AdminService);
  private readonly injector = inject(Injector);
  private readonly destroy$ = new Subject<void>();

  // ── Datos ──────────────────────────────────────────────────────
  registros = signal<HistorialAccesoItemDto[]>([]);
  totalRegistros = signal(0);
  cargando = signal(false);

  // ── Paginación ─────────────────────────────────────────────────
  paginaActual = signal(1);
  readonly porPagina = 20;
  totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.totalRegistros() / this.porPagina))
  );

  // ── Columnas ───────────────────────────────────────────────────
  readonly tableColumns: DataTableColumn[] = [
    { key: 'tipo',            label: 'Tipo',             headerClass: 'col-tipo',     cellClass: 'col-tipo' },
    { key: 'nombre',          label: 'Nombre',           headerClass: 'col-nombre',   cellClass: 'col-nombre' },
    { key: 'empresa',         label: 'Empresa',          headerClass: 'col-empresa',  cellClass: 'text-muted col-empresa' },
    // { key: 'numeroIdentificacion', label: 'No. ID',      headerClass: 'col-id',       cellClass: 'text-mono col-id' },
    { key: 'area',            label: 'Área / Dest.',     headerClass: 'col-area',     cellClass: 'col-area' },
    { key: 'motivo',          label: 'Motivo',           headerClass: 'col-motivo',   cellClass: 'col-motivo' },
    { key: 'fechaEntrada',    label: 'Entrada',          headerClass: 'col-fecha',    cellClass: 'text-mono col-fecha' },
    { key: 'fechaSalida',     label: 'Salida',           headerClass: 'col-fecha',    cellClass: 'text-mono col-fecha' },
    { key: 'minutosEstancia', label: 'Min.',             headerClass: 'col-min',      cellClass: 'text-mono col-min' },
    // { key: 'estadoAcceso',    label: 'Estado',           headerClass: 'col-estado',   cellClass: 'col-estado' },
    { key: 'codigoGafete',    label: 'Gafete',           headerClass: 'col-gafete',   cellClass: 'text-mono col-gafete' },
    // { key: 'guardia',         label: 'Guardia',          headerClass: 'col-guardia',  cellClass: 'text-muted col-guardia' },
  ];

  // ── Datos mapeados para la tabla (datos crudos, el formateo va en el template) ──
  readonly tableData = computed(() =>
    this.registros().map((r) => ({
      ...r,
      _raw: r,
    }))
  );

  // ── Lifecycle ──────────────────────────────────────────────────
  ngOnInit(): void {
    this.layoutSvc.setSubheader({
      title: 'Historial',
      showSearch: true,
      searchPlaceholder: 'Buscar nombre, ID, empresa...',
      filters: [
        {
          type: 'select',
          key: 'tipo',
          placeholder: 'Todos los tipos',
          options: [
            { label: 'Visitante', value: 'Visitante' },
            { label: 'Proveedor', value: 'Proveedor' },
          ],
        },
        {
          type: 'date',
          key: 'desde',
          placeholder: 'Desde',
        },
        {
          type: 'date',
          key: 'hasta',
          placeholder: 'Hasta',
        },
      ],
      actions: [
        {
          label: 'Buscar',
          icon: 'bi-search',
          variant: 'flat' as const,
          handler: () => this.ejecutarBusqueda(),
        },
        {
          label: 'Limpiar',
          icon: 'bi-arrow-counterclockwise',
          variant: 'stroked' as const,
          handler: () => this.limpiarFiltros(),
        },
      ],
    });

    // Reaccionar a cambios en los filtros
    combineLatest([
      toObservable(this.layoutSvc.searchValue, { injector: this.injector }),
      toObservable(this.layoutSvc.filterValues, { injector: this.injector }),
    ])
      .pipe(
        debounceTime(400),
        distinctUntilChanged(
          (prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)
        ),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.paginaActual.set(1);
        this.cargarHistorial();
      });

    // Fecha por defecto "desde" = hoy
    const filtros = this.layoutSvc.filterValues();
    if (!filtros['desde']) {
      const hoy = new Date().toISOString().split('T')[0];
      this.layoutSvc.filterValues.update((f) => ({ ...f, desde: hoy }));
    }

    this.cargarHistorial();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.layoutSvc.resetSubheader();
    this.layoutSvc.closeModal();
  }

  // ── Carga de datos ─────────────────────────────────────────────
  cargarHistorial(): void {
    this.cargando.set(true);

    const filtros = {
      busqueda: this.layoutSvc.searchValue().trim(),
      tipo: this.layoutSvc.filterValues()['tipo'] || '',
      desde: this.layoutSvc.filterValues()['desde'] || '',
      hasta: this.layoutSvc.filterValues()['hasta'] || '',
    };

    this.adminSvc
      .getHistorial(this.paginaActual(), this.porPagina, filtros)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: HistorialPaginado) => {
          this.registros.set(res.items);
          this.totalRegistros.set(res.total);
          this.cargando.set(false);
        },
        error: () => this.cargando.set(false),
      });
  }

  cambiarPagina(delta: number): void {
    const nueva = this.paginaActual() + delta;
    if (nueva >= 1 && nueva <= this.totalPaginas()) {
      this.paginaActual.set(nueva);
      this.cargarHistorial();
    }
  }

  // ── Acciones de los botones ────────────────────────────────────
  ejecutarBusqueda(): void {
    this.paginaActual.set(1);
    this.cargarHistorial();
  }

  limpiarFiltros(): void {
    this.layoutSvc.searchValue.set('');
    this.layoutSvc.filterValues.set({});
    const hoy = new Date().toISOString().split('T')[0];
    this.layoutSvc.filterValues.update((f) => ({ ...f, desde: hoy }));
    this.paginaActual.set(1);
    this.cargarHistorial();
  }

  // ── Helpers de formateo ────────────────────────────────────────
  formatDateTime(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatDuracion(minutos: number | null | undefined): string {
    if (minutos === null || minutos === undefined) return '—';
    const m = Math.floor(minutos);
    if (m < 60) return `${m} m`;
    const h = Math.floor(m / 60);
    const rest = m % 60;
    return rest === 0 ? `${h} h` : `${h} h ${rest} m`;
  }

  getEstadoVariant(estado: string): string {
    switch (estado) {
      case 'Aprobado':
      case 'Salido':
        return 'green';
      case 'Rechazado':
        return 'red';
      case 'Pendiente':
        return 'amber';
      default:
        return 'gray';
    }
  }
}