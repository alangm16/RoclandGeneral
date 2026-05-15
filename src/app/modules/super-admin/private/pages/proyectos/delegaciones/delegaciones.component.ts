import { Component, OnInit, OnDestroy, inject, signal, computed, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, combineLatest } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';
import { LayoutService } from '../../../../../../core/services/layout.service';
import { SuperadminService } from '../../../../services/super-admin.service';
import { DataTableComponent, DataTableColumn } from '../../../../../../shared/components/data-table/data-table.component';
import { BadgeComponent } from '../../../../../../shared/components/badge/badge-component';
import { DelegacionDto, PagedResult } from '../../../../models/superadmin.models';

@Component({
  selector: 'app-delegaciones',
  standalone: true,
  imports: [CommonModule, DataTableComponent],
  templateUrl: './delegaciones.component.html',
  styleUrls: ['./delegaciones.component.scss']
})
export class DelegacionesComponent implements OnInit, OnDestroy {
  private layoutSvc = inject(LayoutService);
  private saSvc = inject(SuperadminService);
  private injector = inject(Injector);
  private destroy$ = new Subject<void>();

  // Datos
  delegaciones = signal<DelegacionDto[]>([]);
  totalRegistros = signal(0);
  cargando = signal(false);

  // Paginación
  paginaActual = signal(1);
  readonly porPagina = 15;
  totalPaginas = computed(() => Math.max(1, Math.ceil(this.totalRegistros() / this.porPagina)));

  // Columnas
  columnas: DataTableColumn[] = [
    { key: 'otorgadoPor', label: 'OTORGADO POR' },
    { key: 'otorgadoA', label: 'OTORGADO A' },
    { key: 'proyectoCodigo', label: 'PROYECTO' },
    { key: 'rol', label: 'ROL' },
    { key: 'fechaAsignacion', label: 'FECHA ASIGNACIÓN', cellClass: 'text-mono' }
  ];

  ngOnInit(): void {
    this.layoutSvc.setSubheader({
      title: 'Delegaciones',
      showSearch: true,
      searchPlaceholder: 'Buscar por usuario, proyecto...',
      filters: [
        {
          type: 'select',
          key: 'proyectoId',
          placeholder: 'Todos los proyectos',
          options: [] // se llenará dinámicamente
        },
        { type: 'date', key: 'desde', placeholder: 'Desde' },
        { type: 'date', key: 'hasta', placeholder: 'Hasta' }
      ],
      actions: [
        {
          label: 'Buscar',
          icon: 'bi-search',
          variant: 'flat',
          handler: () => this.ejecutarBusqueda()
        },
        {
          label: 'Limpiar',
          icon: 'bi-arrow-counterclockwise',
          variant: 'stroked',
          handler: () => this.limpiarFiltros()
        }
      ]
    });

    this.cargarOpcionesProyectos();

    // Reaccionar a cambios en filtros y búsqueda
    combineLatest([
      toObservable(this.layoutSvc.filterValues, { injector: this.injector }),
      toObservable(this.layoutSvc.searchValue, { injector: this.injector })
    ]).pipe(
      debounceTime(400),
      distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.paginaActual.set(1);
      this.cargarDelegaciones();
    });

    this.cargarDelegaciones();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.layoutSvc.resetSubheader();
  }

  private cargarOpcionesProyectos(): void {
    this.saSvc.getProyectos().subscribe({
      next: (proyectos) => {
        const options = proyectos.map(p => ({ label: `${p.nombre} (${p.codigo})`, value: p.id.toString() }));
        const currentFilters = this.layoutSvc.subheaderFilters();
        const idx = currentFilters.findIndex(f => f.key === 'proyectoId');
        if (idx !== -1) {
          const updated = [...currentFilters];
          updated[idx] = { ...updated[idx], options };
          this.layoutSvc.subheaderFilters.set(updated);
        }
      },
      error: () => console.error('Error cargando proyectos para filtro')
    });
  }

  cargarDelegaciones(): void {
    this.cargando.set(true);
    const filtros = {
      proyectoId: this.layoutSvc.filterValues()['proyectoId'] ? +this.layoutSvc.filterValues()['proyectoId'] : undefined,
      desde: this.layoutSvc.filterValues()['desde'] || undefined,
      hasta: this.layoutSvc.filterValues()['hasta'] || undefined,
      pagina: this.paginaActual(),
      tamanoPagina: this.porPagina
    };
    // Búsqueda global (el backend puede no soportarla, se filtra localmente o se ajusta)
    // Por simplicidad, asumimos que el servicio acepta un parámetro 'busqueda'
    // Si no, se puede filtrar localmente después.
    this.saSvc.getDelegaciones(filtros).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: PagedResult<DelegacionDto>) => {
        this.delegaciones.set(res.items);
        this.totalRegistros.set(res.totalRegistros);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.delegaciones.set([]);
        this.totalRegistros.set(0);
      }
    });
  }

  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas()) {
      this.paginaActual.set(pagina);
      this.cargarDelegaciones();
    }
  }

  ejecutarBusqueda(): void {
    this.paginaActual.set(1);
    this.cargarDelegaciones();
  }

  limpiarFiltros(): void {
    this.layoutSvc.searchValue.set('');
    this.layoutSvc.filterValues.set({});
    this.paginaActual.set(1);
    this.cargarDelegaciones();
  }

  formatFecha(fecha: string): string {
    return new Date(fecha).toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}