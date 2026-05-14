import {
  Component, OnInit, OnDestroy, inject, signal,
  ViewChild, ElementRef, effect, PLATFORM_ID
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LayoutService } from '../../../../../core/services/layout.service';
import { SuperadminService } from '../../../services/super-admin.service';
import { BadgeComponent } from '../../../../../shared/components/badge/badge-component';
import { DataTableComponent, DataTableColumn } from '../../../../../shared/components/data-table/data-table.component';
import { Chart, ChartConfiguration } from 'chart.js/auto';
import { computed } from '@angular/core';
import {
  DashboardGlobalDto,
  ProyectoActividadDto,
  GraficoAccesosDto,
  ProyectoConAlertasDto,
  AlertaDto,
  LogAccesoDto
} from '../../../models/superadmin.models';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-superadmin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, BadgeComponent, DataTableComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly layoutSvc = inject(LayoutService);
  private readonly superadminSvc = inject(SuperadminService);
  private readonly platformId = inject(PLATFORM_ID);

  cargandoGlobal = signal(true);
  kpis = signal<DashboardGlobalDto | null>(null);

  // Secciones derivadas
  modulosUsage = signal<ProyectoActividadDto[]>([]);
  proyectosConProblemas = signal<ProyectoConAlertasDto[]>([]);
  ultimosAccesos = signal<LogAccesoDto[]>([]);
  alertas = signal<AlertaDto[]>([]);

  readonly ultimosExitosos = computed(() =>
    this.ultimosAccesos().filter(a => a.exitoso).slice(0, 5)
  );

  readonly ultimosFallidos = computed(() =>
    this.ultimosAccesos().filter(a => !a.exitoso).slice(0, 5)
  );

  // Gráfico
  @ViewChild('accesosChart', { static: false }) accesosChartCanvas!: ElementRef;
  private chartAccesos: Chart | null = null;

  readonly columnasActividad: DataTableColumn[] = [
    { key: 'usuario',    label: 'Usuario',    headerClass: 'col-usuario' },
    { key: 'plataforma', label: 'Plataforma', headerClass: 'text-center col-plataforma' },
    { key: 'fecha',      label: 'Fecha',      headerClass: 'col-fecha' },
  ];

  constructor() {
    effect(() => {
      const _collapsed = this.layoutSvc.sidebarCollapsed();
      setTimeout(() => this.chartAccesos?.resize(), 250);
    });
  }

  ngOnInit(): void {
    this.layoutSvc.setSubheader({ title: 'Dashboard', showSearch: false });
    if (isPlatformBrowser(this.platformId)) {
      this.cargarDatos();
    }
  }

  ngOnDestroy(): void {
    this.chartAccesos?.destroy();
    this.layoutSvc.resetSubheader();
  }

  private cargarDatos(): void {
    forkJoin({
      global: this.superadminSvc.getDashboardGlobal(),
      alertas: this.superadminSvc.getAlertas(false, undefined, 1, 10),         // todas las no resueltas
      logs: this.superadminSvc.getLogsAcceso({}, 1, 10)
    }).subscribe({
      next: ({ global, alertas, logs }) => {
        this.kpis.set(global);
        this.modulosUsage.set(global.proyectosMasAccesos.slice(0, 5));
        this.proyectosConProblemas.set(global.proyectosConProblemas);   // para navegación rápida
        this.alertas.set(alertas.items.slice(0, 10));
        this.ultimosAccesos.set(logs.items.slice(0, 10));
        this.cargandoGlobal.set(false);
        setTimeout(() => this.inicializarGrafico(global.graficoAccesos), 0);
      },
      error: (err) => {
        console.error('Error al cargar dashboard', err);
        this.cargandoGlobal.set(false);
      }
    });
  }

  private inicializarGrafico(grafico: GraficoAccesosDto[]): void {
    if (!this.accesosChartCanvas) return;
    const ctx = this.accesosChartCanvas.nativeElement.getContext('2d');
    const labels = grafico.map(g => {
      const d = new Date(g.fecha + 'T00:00:00');
      return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' });
    });
    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Exitosos',
            data: grafico.map(g => g.exitosos),
            borderColor: '#16a34a',
            backgroundColor: 'rgba(22,163,74,0.08)',
            fill: true,
            tension: 0.3,
          },
          {
            label: 'Fallidos',
            data: grafico.map(g => g.fallidos),
            borderColor: '#DC2626',
            backgroundColor: 'rgba(220,38,38,0.08)',
            fill: true,
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: true, position: 'bottom' } },
        scales: { y: { beginAtZero: true } },
      },
    };
    this.chartAccesos = new Chart(ctx, config);
  }

  getAlertaIcon(tipo: string): string {
    const icons: Record<string, string> = {
      critical: 'bi-shield-exclamation',
      error: 'bi-exclamation-triangle-fill',
      warning: 'bi-exclamation-triangle',
      info: 'bi-info-circle-fill',
    };
    return icons[tipo] || 'bi-bell';
  }

  totalAccesosPeriodo(): number {
    const grafico = this.kpis()?.graficoAccesos || [];
    return grafico.reduce((sum, g) => sum + g.exitosos + g.fallidos, 0);
  }
}