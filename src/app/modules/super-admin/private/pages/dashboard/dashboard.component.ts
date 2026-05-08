import { Component, OnInit, OnDestroy, inject, signal, ViewChild, ElementRef, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import Chart from 'chart.js/auto';
import { LayoutService } from '../../../../../core/services/layout.service';
import { SuperAdminService } from '../../../services/super-admin.service';
import { SuperAdminDashboardKpis, AccesoLog, ModuloUsage, AlertaSA, AccesosDiaSemana } from '../../../models/superadmin.models';
import { DataTableComponent, DataTableColumn } from '../../../../../shared/components/data-table/data-table.component';
import { BadgeComponent } from '../../../../../shared/components/badge/badge-component';

@Component({
  selector: 'app-superadmin-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    DataTableComponent, 
    BadgeComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly layoutSvc  = inject(LayoutService);
  private readonly saSvc      = inject(SuperAdminService);
  private readonly platformId = inject(PLATFORM_ID);

  cargandoGlobal = signal<boolean>(true);

  // ── Estado de Datos ──
  kpis            = signal<SuperAdminDashboardKpis | null>(null);
  ultimosAccesos  = signal<AccesoLog[]>([]);
  modulosUsage    = signal<ModuloUsage[]>([]);
  alertas         = signal<AlertaSA[]>([]);
  
  // ── Configuración de la Tabla de Logs ──
  columnasLogs: DataTableColumn[] = [
    { key: 'usuario', label: 'USUARIO' },
    { key: 'plataforma', label: 'PLATAFORMA' },
    { key: 'fecha', label: 'FECHA Y HORA' },
    { key: 'estado', label: 'ESTADO' }
  ];

  // ── Gráfica ──
  @ViewChild('accesosChart', { static: false }) chartCanvas!: ElementRef<HTMLCanvasElement>;
  private chartInstance: Chart | null = null;
  private timeInterval: any;
  currentTime = signal<string>('');

  ngOnInit(): void {
    this.layoutSvc.setSubheader({ title: 'Dashboard', showSearch: false });
    this.iniciarReloj();
    this.cargarTodo();
  }

  ngOnDestroy(): void {
    if (this.timeInterval) clearInterval(this.timeInterval);
    if (this.chartInstance) this.chartInstance.destroy();
  }

  private cargarTodo(): void {
    this.cargandoGlobal.set(true);
    
    forkJoin({
      kpis: this.saSvc.getKpis(),
      grafica: this.saSvc.getAccesosSemana(),
      modulos: this.saSvc.getUsoModulos(),
      alertas: this.saSvc.getAlertasActivas(),
      logs: this.saSvc.getLogsRecientes(5)
    }).subscribe({
      next: (res) => {
        this.kpis.set(res.kpis);
        this.modulosUsage.set(res.modulos);
        this.alertas.set(res.alertas);
        this.ultimosAccesos.set(res.logs);
        
        if (isPlatformBrowser(this.platformId)) {
          setTimeout(() => this.renderChart(res.grafica), 50);
        }
        this.cargandoGlobal.set(false);
      },
      error: (err) => {
        console.error('Error cargando el dashboard:', err);
        this.cargandoGlobal.set(false);
      }
    });
  }

  // ── Helpers para la UI ──
  getAlertaIcon(tipo: string): string {
    const iconos: { [key: string]: string } = {
      'error': 'bi-x-circle-fill',
      'warning': 'bi-exclamation-circle-fill',
      'critical': 'bi-shield-fill-exclamation',
      'info': 'bi-info-circle-fill'
    };
    return iconos[tipo] || 'bi-info-circle-fill';
  }

  private renderChart(datos: AccesosDiaSemana[]): void {
    if (this.chartInstance) this.chartInstance.destroy();
    const ctx = this.chartCanvas?.nativeElement.getContext('2d');
    if (!ctx) return;

    this.chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: datos.map(d => d.dia),
        datasets: [
          { label: 'Exitosos', data: datos.map(d => d.exitosos), borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.4 },
          { label: 'Fallidos', data: datos.map(d => d.fallidos), borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', fill: true, tension: 0.4 }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  private iniciarReloj(): void {
    const tick = () => this.currentTime.set(new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }));
    tick();
    this.timeInterval = setInterval(tick, 60000);
  }
}