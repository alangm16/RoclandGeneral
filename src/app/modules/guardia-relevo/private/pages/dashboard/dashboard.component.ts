// dashboard.component.ts
import {
  Component, OnInit, OnDestroy, inject, signal,
  ViewChild, ElementRef, PLATFORM_ID, effect
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, forkJoin, of } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import { Chart, ChartConfiguration } from 'chart.js/auto';

import { LayoutService } from '../../../../../core/services/layout.service';
import { GuardiaRelevoService } from '../../../services/guardia-relevo.service';
import { BadgeComponent } from '../../../../../shared/components/badge/badge-component';
import { DataTableComponent, DataTableColumn } from '../../../../../shared/components/data-table/data-table.component';
import {
  DashboardResumenDto,
  IncidenciaDto,
  ChecklistResumenDto
} from '../../../models/guardia-relevo.models';

@Component({
  selector: 'app-guardia-relevo-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, DataTableComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit, OnDestroy {
  private layoutSvc = inject(LayoutService);
  private grService = inject(GuardiaRelevoService);
  private platformId = inject(PLATFORM_ID);
  private destroy$ = new Subject<void>();

  cargando = signal(true);

  // KPIs
  totalRondinesHoy = signal(0);
  totalIncidenciasAbiertas = signal(0);
  totalIncidenciasResueltas = signal(0);
  porcentajeIncidenciasResueltas = signal(0);
  totalChecklistsSalientes = signal(0);
  totalChecklistsEntrantes = signal(0);

  // Checklists recientes (últimos 5)
  rondinesRecientes = signal<ChecklistResumenDto[]>([]);

  // Incidencias recientes (últimas 5)
  incidenciasRecientes = signal<IncidenciaDto[]>([]);

  // Datos para gráficos (checklists por día, incidencias por día)
  checklistsPorDia = signal<{ fecha: string; cantidad: number }[]>([]);
  incidenciasPorDia = signal<{ fecha: string; creadas: number; resueltas: number }[]>([]);

  columnasIncidencias: DataTableColumn[] = [
    { key: 'fechaDeteccionLocal', label: 'Fecha', headerClass: 'col-fecha' },
    { key: 'punto', label: 'Punto', headerClass: 'col-punto' },
    { key: 'categoria', label: 'Categoría', headerClass: 'col-categoria' },
    { key: 'resuelta', label: 'Estado', headerClass: 'col-estado' },
  ];

  @ViewChild('actividadChart', { static: false }) actividadChartCanvas!: ElementRef;
  private chart: Chart | null = null;

  constructor() {
    effect(() => {
      this.layoutSvc.sidebarCollapsed();
      setTimeout(() => this.chart?.resize(), 250);
    });
  }

  ngOnInit(): void {
    this.layoutSvc.setSubheader({ title: 'Dashboard', showSearch: false });
    if (isPlatformBrowser(this.platformId)) {
      this.cargarDatos();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.chart?.destroy();
    this.layoutSvc.resetSubheader();
  }

  private cargarDatos(): void {
    // Resumen del dashboard
    const resumen$ = this.grService.getDashboardResumen().pipe(catchError(() => of(null)));

    // Checklists por día (últimos 7 días)
    const checklistsPorDia$ = this.grService.getChecklistsPorDia(7).pipe(catchError(() => of([])));

    // Incidencias por día (últimos 30 días)
    const incidenciasPorDia$ = this.grService.getIncidenciasPorDia(30).pipe(catchError(() => of([])));

    // Rondines recientes (últimos 5)
    const rondinesRecientes$ = this.grService.getHistorial(undefined, undefined, undefined).pipe(
      catchError(() => of([]))
    );

    // Incidencias recientes (últimas 5, abiertas primero)
    const incidenciasRecientes$ = this.grService.getIncidencias(null).pipe(
      catchError(() => of([]))
    );

    forkJoin({
      resumen: resumen$,
      checklistsPorDia: checklistsPorDia$,
      incidenciasPorDia: incidenciasPorDia$,
      rondinesRecientes: rondinesRecientes$,
      incidenciasRecientes: incidenciasRecientes$
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (results) => {
        // Resumen
        if (results.resumen) {
          this.totalRondinesHoy.set(results.resumen.totalChecklistsHoy);
          this.totalIncidenciasAbiertas.set(results.resumen.totalIncidenciasAbiertas);
          this.totalIncidenciasResueltas.set(results.resumen.totalIncidenciasResueltas);
          this.porcentajeIncidenciasResueltas.set(results.resumen.porcentajeIncidenciasResueltas);
          this.totalChecklistsSalientes.set(results.resumen.totalChecklistsSalientes);
          this.totalChecklistsEntrantes.set(results.resumen.totalChecklistsEntrantes);
        }

        // Checklists por día
        this.checklistsPorDia.set(results.checklistsPorDia);

        // Incidencias por día
        this.incidenciasPorDia.set(results.incidenciasPorDia);

        // Rondines recientes (tomar primeros 5)
        this.rondinesRecientes.set(results.rondinesRecientes.slice(0, 5));

        // Incidencias recientes (tomar primeras 5, ordenar por fecha descendente)
        const incs = results.incidenciasRecientes
          .sort((a, b) => new Date(b.fechaDeteccionLocal).getTime() - new Date(a.fechaDeteccionLocal).getTime())
          .slice(0, 5);
        this.incidenciasRecientes.set(incs);

        this.cargando.set(false);
        setTimeout(() => this.inicializarGrafico(), 0);
      },
      error: (err) => {
        console.error('Error cargando dashboard', err);
        this.cargando.set(false);
      }
    });
  }

  private inicializarGrafico(): void {
  if (!this.actividadChartCanvas) return;

  const datos = this.checklistsPorDia();
  if (!datos.length) return;

  // Formatear fechas a DD/MM
  const labels = datos.map(item => {
  const date = new Date(item.fecha);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${day}/${month}`;
});
  const values = datos.map(item => item.cantidad);

  const config: ChartConfiguration = {
    type: 'line', // o 'bar', según prefieras
    data: {
      labels,
      datasets: [{
        label: 'Rondines completados',
        data: values,
        borderColor: '#4CAF50',
        backgroundColor: 'rgba(76,175,80,0.08)',
        fill: true,
        tension: 0.3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
    }
  };
  this.chart = new Chart(this.actividadChartCanvas.nativeElement, config);
}

  columnasRondines: DataTableColumn[] = [
    { key: 'fechaHoraLocal', label: 'Fecha', headerClass: 'col-fecha' },
    { key: 'tipoRondin', label: 'Tipo', headerClass: 'col-tipo' },
    { key: 'guardia', label: 'Guardia', headerClass: 'col-guardia' },
    { key: 'todoOk', label: 'Resultado', headerClass: 'col-resultado' },
  ];
}