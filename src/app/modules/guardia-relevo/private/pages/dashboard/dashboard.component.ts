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
  RelevoHoyResponse,
  IncidenciaListResponse,
  PagedResult,
  RelevoListResponse
} from '../../../models/guardia-relevo.models';

@Component({
  selector: 'app-guardia-relevo-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, BadgeComponent, DataTableComponent],
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
  totalRelevosHoy = signal(0);
  relevosCompletadosHoy = signal(0);
  incidenciasAbiertas = signal(0);
  cumplimientoChecklist = signal(0); // % de incidencias resueltas última semana

  // Relevos del día
  relevoDiurno = signal<RelevoHoyResponse | null>(null);
  relevoNocturno = signal<RelevoHoyResponse | null>(null);

  // Incidencias recientes
  incidenciasRecientes = signal<IncidenciaListResponse[]>([]);

  columnasIncidencias = [
    { key: 'fechaRelevo', label: 'Fecha', headerClass: 'col-fecha' },
    { key: 'nombrePunto', label: 'Punto', headerClass: 'col-punto' },
    { key: 'tipoOrigen', label: 'Tipo', headerClass: 'col-tipo' },
    { key: 'estado', label: 'Estado', headerClass: 'col-estado' },
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
    const hoy = new Date().toISOString().split('T')[0];
    const haceSemana = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Helper para fallback de PagedResult
    const emptyPaged = <T>(): PagedResult<T> => ({
      items: [],
      totalCount: 0,
      page: 1,
      pageSize: 10,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
    });

    // 1. Relevos de hoy
    const relevosHoy$ = this.grService.getRelevosPaginados({ fechaDesde: hoy, fechaHasta: hoy, page: 1, pageSize: 100 })
      .pipe(catchError(() => of(emptyPaged<RelevoListResponse>())));

    // 2. Incidencias abiertas (solo contar)
    const incidenciasAbiertas$ = this.grService.getIncidenciasPaginadas({ estado: 'Abierta', page: 1, pageSize: 1 })
      .pipe(catchError(() => of(emptyPaged<IncidenciaListResponse>())));

    // 3. Incidencias de la última semana (para calcular cumplimiento = resueltas/totales)
    const incidenciasSemana$ = this.grService.getIncidenciasPaginadas({ fechaDesde: haceSemana, fechaHasta: hoy, page: 1, pageSize: 1000 })
      .pipe(catchError(() => of(emptyPaged<IncidenciaListResponse>())));

    // 4. Relevos de hoy por turno
    const relevoDiurno$ = this.grService.getRelevoHoy(1).pipe(catchError(() => of(null)));
    const relevoNocturno$ = this.grService.getRelevoHoy(2).pipe(catchError(() => of(null)));

    // 5. Incidencias recientes (últimas 5)
    const incidenciasRecientes$ = this.grService.getIncidenciasPaginadas({ page: 1, pageSize: 5 })
      .pipe(catchError(() => of(emptyPaged<IncidenciaListResponse>())));

    forkJoin({
      relevosHoy: relevosHoy$,
      incidenciasAbiertas: incidenciasAbiertas$,
      incidenciasSemana: incidenciasSemana$,
      relevoDiurno: relevoDiurno$,
      relevoNocturno: relevoNocturno$,
      incidenciasRecientes: incidenciasRecientes$
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (results) => {
        // KPIs básicos
        this.totalRelevosHoy.set(results.relevosHoy.totalCount);
        const completados = (results.relevosHoy.items ?? []).filter(r => r.estado === 'Completado').length;
        this.relevosCompletadosHoy.set(completados);
        this.incidenciasAbiertas.set(results.incidenciasAbiertas.totalCount);

        // Cumplimiento = % incidencias resueltas en la última semana
        const totalIncidenciasSemana = results.incidenciasSemana.totalCount;
        const resueltasSemana = (results.incidenciasSemana.items ?? []).filter(i => i.estado === 'Resuelta').length;
        const cumplimiento = totalIncidenciasSemana > 0 ? Math.round((resueltasSemana / totalIncidenciasSemana) * 100) : 100;
        this.cumplimientoChecklist.set(cumplimiento);

        // Relevos del día
        this.relevoDiurno.set(results.relevoDiurno);
        this.relevoNocturno.set(results.relevoNocturno);

        // Incidencias recientes
        this.incidenciasRecientes.set(results.incidenciasRecientes.items.slice(0, 5));

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
    // Datos mock (podrías reemplazar con endpoint real)
    const labels = ['06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19'];
    const data = [2, 5, 8, 12, 10, 7, 6, 9, 11, 13, 10, 8, 6, 4];
    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Actividad (accesos)',
          data,
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
        scales: { y: { beginAtZero: true, ticks: { stepSize: 2 } } }
      }
    };
    this.chart = new Chart(this.actividadChartCanvas.nativeElement, config);
  }
}