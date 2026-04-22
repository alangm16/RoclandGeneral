// dashboard.component.ts (versión limpia, sin cambios en la lógica)
import { Component, OnInit, inject, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Chart from 'chart.js/auto';
import { AdminService } from '../../../services/admin.service';
import { DashboardKpis, ActivoZona } from '../../../models/admin.models';
import { SignalrService, SignalRStatus } from '../../../services/signalr.service';
import { Subscription, interval } from 'rxjs';
import { environment } from '../../../../../../environmets/Environment';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: 'dashboard.component.html',
  styleUrls: ['dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly adminService = inject(AdminService);
  private readonly signalrService = inject(SignalrService);

  conexionStatus: SignalRStatus = 'disconnected';
  private subs: Subscription = new Subscription();

  kpis: DashboardKpis | null = null;
  visitantesDentro: ActivoZona[] = [];
  proveedoresDentro: ActivoZona[] = [];
  
  anioActual: number = new Date().getFullYear();
  mesActual: number = new Date().getMonth() + 1;
  aniosDisponibles: number[] = [this.anioActual, this.anioActual - 1, this.anioActual - 2];
  mesesDisponibles = [
    { id: 1, nombre: 'Enero' }, { id: 2, nombre: 'Febrero' }, { id: 3, nombre: 'Marzo' },
    { id: 4, nombre: 'Abril' }, { id: 5, nombre: 'Mayo' }, { id: 6, nombre: 'Junio' },
    { id: 7, nombre: 'Julio' }, { id: 8, nombre: 'Agosto' }, { id: 9, nombre: 'Septiembre' },
    { id: 10, nombre: 'Octubre' }, { id: 11, nombre: 'Noviembre' }, { id: 12, nombre: 'Diciembre' }
  ];

  @ViewChild('canvasHoras', { static: false }) canvasHoras!: ElementRef;
  @ViewChild('canvasAreas', { static: false }) canvasAreas!: ElementRef;
  @ViewChild('canvasMes', { static: false }) canvasMes!: ElementRef;

  private chartHoras: Chart | null = null;
  private chartAreas: Chart | null = null;
  private chartMes: Chart | null = null;

  currentTime: string = '';
  private clockInterval: any;

  ngOnInit(): void {
    this.cargarDatos();
    this.configurarSignalR();
    this.iniciarReloj();
  }

  ngOnDestroy(): void {
    this.chartHoras?.destroy();
    this.chartAreas?.destroy();
    this.chartMes?.destroy();
    this.subs.unsubscribe();
    this.signalrService.detenerConexion();
    this.detenerReloj();
  }

  private configurarSignalR(): void {
    this.signalrService.iniciarConexion();
    this.subs.add(
      this.signalrService.status$.subscribe(status => this.conexionStatus = status)
    );
    this.subs.add(
      this.signalrService.nuevaSolicitud$.subscribe(() => this.cargarKpis())
    );
    this.subs.add(
      this.signalrService.solicitudResuelta$.subscribe(() => {
        this.cargarKpis();
        this.cargarActivos();
        this.cargarGraficaHoras();
      })
    );
    this.subs.add(
      this.signalrService.salidaRegistrada$.subscribe(() => {
        this.cargarKpis();
        this.cargarActivos();
      })
    );
    this.subs.add(
      interval(30000).subscribe(() => {
        if (!this.signalrService.isConnected) this.cargarKpis();
      })
    );
  }

  cargarDatos(): void {
    this.cargarKpis();
    this.cargarActivos();
    this.cargarGraficaHoras();
    this.cargarGraficaAreas();
    this.cargarGraficaMes();
  }

  cargarKpis(): void {
    this.adminService.getKpis().subscribe({
      next: (data) => this.kpis = data,
      error: (err) => console.error('Error cargando KPIs', err)
    });
  }

  cargarActivos(): void {
    this.adminService.getActivosZona().subscribe({
      next: (data) => {
        this.visitantesDentro = data.filter(a => a.tipoRegistro === 'Visitante');
        this.proveedoresDentro = data.filter(a => a.tipoRegistro === 'Proveedor');
      },
      error: (err) => console.error('Error cargando activos', err)
    });
  }

  private iniciarReloj(): void {
    this.updateClock();
    this.clockInterval = setInterval(() => this.updateClock(), 1000);
  }
  private detenerReloj(): void { if (this.clockInterval) clearInterval(this.clockInterval); }
  private updateClock(): void {
    this.currentTime = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  exportarExcel(): void { window.open(`${environment.apiUrl}/api/web/accesocontrol/admin/exportar/excel`, '_blank'); }
  exportarPDF(): void { window.open(`${environment.apiUrl}/api/web/accesocontrol/admin/exportar/pdf`, '_blank'); }

  cargarGraficaHoras(): void {
    this.adminService.getFlujoHoras().subscribe(data => {
      const labels = data.map(d => d.hora + ':00');
      const valores = data.map(d => d.total);
      if (this.chartHoras) {
        this.chartHoras.data.labels = labels;
        this.chartHoras.data.datasets[0].data = valores;
        this.chartHoras.update();
        return;
      }
      setTimeout(() => {
        if (!this.canvasHoras) return;
        this.chartHoras = new Chart(this.canvasHoras.nativeElement, {
          type: 'bar',
          data: { labels, datasets: [{ label: 'Accesos', data: valores, backgroundColor: '#3B82F6BB', borderColor: '#3B82F6', borderWidth: 1, borderRadius: 4 }] },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
      }, 0);
    });
  }

  cargarGraficaAreas(): void {
    this.adminService.getAreasRanking().subscribe(data => {
      const labels = data.map(d => d.area);
      const valores = data.map(d => d.total);
      const bgColors = ['#22C55E', '#3B82F6', '#8B5CF6', '#F59E0B', '#DC2626', '#06B6D4'];
      if (this.chartAreas) {
        this.chartAreas.data.labels = labels;
        this.chartAreas.data.datasets[0].data = valores;
        this.chartAreas.update();
        return;
      }
      setTimeout(() => {
        if (!this.canvasAreas) return;
        this.chartAreas = new Chart(this.canvasAreas.nativeElement, {
          type: 'doughnut',
          data: { labels, datasets: [{ data: valores, backgroundColor: bgColors, borderWidth: 2, borderColor: '#ffffff' }] },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
        });
      }, 0);
    });
  }

  cargarGraficaMes(): void {
    this.adminService.getFlujoDiario(this.anioActual, this.mesActual).subscribe(data => {
      const labels = data.map(d => d.fecha);
      const valVisitantes = data.map(d => d.visitantes);
      const valProveedores = data.map(d => d.proveedores);
      if (this.chartMes) {
        this.chartMes.data.labels = labels;
        this.chartMes.data.datasets[0].data = valVisitantes;
        this.chartMes.data.datasets[1].data = valProveedores;
        this.chartMes.update();
        return;
      }
      setTimeout(() => {
        if (!this.canvasMes) return;
        this.chartMes = new Chart(this.canvasMes.nativeElement, {
          type: 'line',
          data: {
            labels,
            datasets: [
              { label: 'Visitantes', data: valVisitantes, borderColor: '#3B82F6', backgroundColor: '#3B82F622', fill: true, tension: 0.4 },
              { label: 'Proveedores', data: valProveedores, borderColor: '#8B5CF6', backgroundColor: '#8B5CF622', fill: true, tension: 0.4 }
            ]
          },
          options: { responsive: true, maintainAspectRatio: false }
        });
      }, 0);
    });
  }

  fmtHora(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }
}