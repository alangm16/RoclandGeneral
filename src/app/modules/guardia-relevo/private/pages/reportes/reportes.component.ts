import { Component, OnInit, OnDestroy, inject, signal, computed, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, combineLatest, firstValueFrom, forkJoin } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';
import { LayoutService } from '../../../../../core/services/layout.service';
import { GuardiaRelevoService } from '../../../services/guardia-relevo.service';
import { AlertService } from '../../../../../shared/components/swal-alert/alert.service';
import { DataTableComponent, DataTableColumn } from '../../../../../shared/components/data-table/data-table.component';
import { BadgeComponent } from '../../../../../shared/components/badge/badge-component';
import { FiltrarRelevosRequest, RelevoListResponse, PagedResult } from '../../../models/guardia-relevo.models';

@Component({
  selector: 'app-guardia-relevo-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, DataTableComponent, BadgeComponent],
  templateUrl: './reportes.component.html',
  styleUrls: ['./reportes.component.scss'],
})
export class ReportesComponent implements OnInit, OnDestroy {
  private layoutSvc = inject(LayoutService);
  private grService = inject(GuardiaRelevoService);
  private alert = inject(AlertService);
  private destroy$ = new Subject<void>();

  // Filtros de fecha
  fechaDesde = signal<string>('');
  fechaHasta = signal<string>('');

  // Datos de la tabla (paginada)
  relevos = signal<RelevoListResponse[]>([]);
  totalRegistros = signal(0);
  cargando = signal(false);
  paginaActual = signal(1);
  readonly porPagina = 20;
  totalPaginas = computed(() => Math.max(1, Math.ceil(this.totalRegistros() / this.porPagina)));

  // KPIs (ahora calculados correctamente sobre todo el rango)
  totalRelevos = signal(0);
  completados = signal(0);
  totalIncidencias = signal(0);

  // Columnas de la tabla
  columnas: DataTableColumn[] = [
    { key: 'fecha', label: 'FECHA', cellClass: 'text-mono' },
    { key: 'nombreTurno', label: 'TURNO' },
    { key: 'nombreSaliente', label: 'SALIENTE' },
    { key: 'nombreEntrante', label: 'ENTRANTE' },
    { key: 'estado', label: 'ESTADO', cellClass: 'text-center' },
    { key: 'totalIncidenciasAbiertas', label: 'INC. ABIERTAS', cellClass: 'text-center' },
    { key: 'totalIncidenciasResueltas', label: 'INC. RESUELTAS', cellClass: 'text-center' },
  ];

  ngOnInit(): void {
    this.layoutSvc.setSubheader({
      title: 'Reportes',
      showSearch: false,
      filters: [
        { type: 'date', key: 'fechaDesde', placeholder: 'Fecha desde' },
        { type: 'date', key: 'fechaHasta', placeholder: 'Fecha hasta' },
      ],
      actions: [
        {
          label: 'Generar',
          icon: 'bi-search',
          variant: 'flat',
          handler: () => this.generarReporte(),
        },
        {
          label: 'Limpiar',
          icon: 'bi-arrow-counterclockwise',
          variant: 'stroked',
          handler: () => this.limpiarFiltros(),
        },
        {
          label: 'Exportar Excel',
          icon: 'bi-file-excel',
          variant: 'flat',
          handler: () => this.exportarExcel(),
        },
      ],
    });

    // Fechas por defecto: últimos 7 días
    const hoy = new Date();
    const hace7Dias = new Date();
    hace7Dias.setDate(hoy.getDate() - 7);
    this.fechaDesde.set(hace7Dias.toISOString().split('T')[0]);
    this.fechaHasta.set(hoy.toISOString().split('T')[0]);

    this.layoutSvc.filterValues.set({
      fechaDesde: this.fechaDesde(),
      fechaHasta: this.fechaHasta(),
    });

    this.generarReporte();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.layoutSvc.resetSubheader();
  }

  generarReporte(): void {
    this.paginaActual.set(1);
    // Cargar tabla paginada y también todos los datos para KPIs
    this.cargarTablaPaginada();
    this.cargarTodosLosDatos();
  }

  limpiarFiltros(): void {
    this.layoutSvc.filterValues.set({});
    this.fechaDesde.set('');
    this.fechaHasta.set('');
    this.paginaActual.set(1);
    this.generarReporte();
  }

  // Carga la tabla con paginación
  private cargarTablaPaginada(): void {
    this.cargando.set(true);
    const filtros: FiltrarRelevosRequest = {
      page: this.paginaActual(),
      pageSize: this.porPagina,
      fechaDesde: this.layoutSvc.filterValues()['fechaDesde'] || undefined,
      fechaHasta: this.layoutSvc.filterValues()['fechaHasta'] || undefined,
    };

    this.grService
      .getRelevosPaginados(filtros)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: PagedResult<RelevoListResponse>) => {
          this.relevos.set(res.items);
          this.totalRegistros.set(res.totalCount);
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.alert.error('No se pudieron cargar los datos del reporte');
        },
      });
  }

  // Carga TODOS los relevos del rango (sin paginación) para calcular KPIs reales
  private cargarTodosLosDatos(): void {
    const filtros: FiltrarRelevosRequest = {
      page: 1,
      pageSize: 9999, // un número grande para obtener todos
      fechaDesde: this.layoutSvc.filterValues()['fechaDesde'] || undefined,
      fechaHasta: this.layoutSvc.filterValues()['fechaHasta'] || undefined,
    };

    this.grService
      .getRelevosPaginados(filtros)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: PagedResult<RelevoListResponse>) => {
          const items = res.items;
          this.totalRelevos.set(res.totalCount);
          const completadosCount = items.filter(r => r.estado === 'Completado').length;
          const totalInc = items.reduce((acc, r) => acc + r.totalIncidenciasAbiertas + r.totalIncidenciasResueltas, 0);
          this.completados.set(completadosCount);
          this.totalIncidencias.set(totalInc);
        },
        error: () => {
          // Si falla, no mostramos error al usuario, solo dejamos KPIs en cero
          console.error('Error cargando datos para KPIs');
        },
      });
  }

  cambiarPagina(delta: number): void {
    const nueva = this.paginaActual() + delta;
    if (nueva >= 1 && nueva <= this.totalPaginas()) {
      this.paginaActual.set(nueva);
      this.cargarTablaPaginada();
    }
  }

  // Exporta TODOS los relevos del rango (no solo la página actual)
  async exportarExcel(): Promise<void> {
    const filtros: FiltrarRelevosRequest = {
      page: 1,
      pageSize: 9999,
      fechaDesde: this.layoutSvc.filterValues()['fechaDesde'] || undefined,
      fechaHasta: this.layoutSvc.filterValues()['fechaHasta'] || undefined,
    };

    try {
      const res = await firstValueFrom(this.grService.getRelevosPaginados(filtros));
      if (res.items.length === 0) {
        this.alert.error('No hay datos para exportar');
        return;
      }

      const headers = ['Fecha', 'Turno', 'Saliente', 'Entrante', 'Estado', 'Inc. Abiertas', 'Inc. Resueltas'];
      const rows = res.items.map(r => [
        r.fecha,
        r.nombreTurno,
        r.nombreSaliente || '',
        r.nombreEntrante || '',
        r.estado,
        r.totalIncidenciasAbiertas,
        r.totalIncidenciasResueltas,
      ]);
      const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.setAttribute('download', `reporte_relevos_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      this.alert.exito('Reporte exportado correctamente');
    } catch (error) {
      this.alert.error('No se pudo exportar el reporte');
    }
  }

  getEstadoVariant(estado: string): string {
    switch (estado) {
      case 'Pendiente': return 'gray';
      case 'EnCurso': return 'blue';
      case 'Completado': return 'green';
      case 'Incompleto': return 'red';
      default: return 'gray';
    }
  }

  formatFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-MX');
  }
}