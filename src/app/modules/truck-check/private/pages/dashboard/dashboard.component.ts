import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Chart from 'chart.js/auto';
import { TruckCheckService } from '../../../services/truckcheck-services';
import { 
  CamionAfuera, CamionDentro, FlujoHorario,
  SucursalFrecuencia, DashboardResume,
  ViajesCamionMensual
} from '../../../models/truckcheck.models';
import { LayoutService } from '../../../../../core/services/layout.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard-truck',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardTruckComponent implements OnInit, AfterViewInit, OnDestroy {
  private truckService = inject(TruckCheckService);
  private layoutService = inject(LayoutService);
  private platformId = inject(PLATFORM_ID);

  kpis = { totalCamionesAfuera: 0, totalSalidasHoy: 0, promedioMinutosFuera: 0 };
  camionesAfuera: CamionAfuera[] = [];
  camionesDentro: CamionDentro[] = [];
  sucursalesTop: SucursalFrecuencia[] = [];
  flujoHoras: FlujoHorario[] = [];
  viajesCamion: ViajesCamionMensual[] = [];

  anioActual = new Date().getFullYear();
  aniosDisponibles: number[] = [this.anioActual, this.anioActual - 1, this.anioActual - 2];

  @ViewChild('canvasHoras') canvasHoras!: ElementRef;
  @ViewChild('canvasSucursales') canvasSucursales!: ElementRef;
  @ViewChild('canvasCamiones') canvasCamiones!: ElementRef;

  private chartHoras: Chart | null = null;
  private chartSucursales: Chart | null = null;
  private chartCamiones: Chart | null = null;
  private subscriptions: Subscription = new Subscription();

  private datosCargados = false;
  private viewInicializada = false;

  ngOnInit(): void {
    this.layoutService.setSubheader({
      title: 'Dashboard',
      showSearch: false,
      showExport: false
    });

    if (isPlatformBrowser(this.platformId)) {
      this.cargarDatosCompletos();
    }
  }

  ngAfterViewInit(): void {
    this.viewInicializada = true;
    if (this.datosCargados) {
      this.renderGraficas();
    }
  }

  ngOnDestroy(): void {
    this.chartHoras?.destroy();
    this.chartSucursales?.destroy();
    this.chartCamiones?.destroy();
    this.subscriptions.unsubscribe();
    this.layoutService.resetSubheader();
  }

  cargarDatosCompletos(): void {
    this.truckService.getDashboardResumen().subscribe({
      next: (res: DashboardResume) => {
        this.kpis = {
          totalCamionesAfuera: res?.kpiCamionesAfuera?.totalCamionesAfuera ?? 0,
          totalSalidasHoy: res?.kpiSalidasHoy?.totalSalidasHoy ?? 0,
          promedioMinutosFuera: res?.kpiPromedioMinutosFuera?.promedioMinutosFuera ?? 0
        };
        this.camionesAfuera = res.camionesAfuera || [];
        this.sucursalesTop = res.sucursalesMasVisitadas || [];
        this.flujoHoras = res.flujoPorHora || [];

        this.cargarViajesPorCamion(); // Carga la nueva gráfica

        this.datosCargados = true;
        if (this.viewInicializada) {
          setTimeout(() => this.renderGraficas(), 0);
        }
      },
      error: err => console.error('Error cargando resumen dashboard', err)
    });

    this.truckService.getCamionesDentro().subscribe({
      next: (data) => this.camionesDentro = data,
      error: () => console.warn('Endpoint camiones dentro no disponible aún')
    });
  }

  cargarViajesPorCamion(): void {
    this.truckService.getViajesPorCamion(this.anioActual).subscribe({
      next: (data) => {
        this.viajesCamion = data;
        this.renderGraficaCamiones();
      },
      error: (err) => console.error('Error cargando viajes por camión', err)
    });
  }

  private renderGraficas(): void {
    this.renderGraficaHoras();
    this.renderGraficaSucursales();
    this.renderGraficaCamiones();
  }

  private renderGraficaHoras(): void {
    if (!this.canvasHoras || !this.flujoHoras?.length) return;

    const labels = this.flujoHoras.map(h => `${h.hora}:00`);
    const entradas = this.flujoHoras.map(h => h.entradas);
    const salidas = this.flujoHoras.map(h => h.salidas);

    if (this.chartHoras) {
      this.chartHoras.data.labels = labels;
      this.chartHoras.data.datasets[0].data = entradas;
      this.chartHoras.data.datasets[1].data = salidas;
      this.chartHoras.update();
      return;
    }

    this.chartHoras = new Chart(this.canvasHoras.nativeElement, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Entradas', data: entradas, backgroundColor: '#22C55E', borderRadius: 4 },
          { label: 'Salidas', data: salidas, backgroundColor: '#3B82F6', borderRadius: 4 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
      }
    });
  }

  private renderGraficaSucursales(): void {
    if (!this.canvasSucursales || !this.sucursalesTop?.length) return;

    const labels = this.sucursalesTop.map(s => s.sucursal);
    const valores = this.sucursalesTop.map(s => s.totalVisitas);
    const colores = ['#22C55E', '#3B82F6', '#8B5CF6', '#F59E0B', '#DC2626'];

    if (this.chartSucursales) {
      this.chartSucursales.data.labels = labels;
      this.chartSucursales.data.datasets[0].data = valores;
      this.chartSucursales.update();
      return;
    }

    this.chartSucursales = new Chart(this.canvasSucursales.nativeElement, {
      type: 'doughnut',
      data: { labels, datasets: [{ data: valores, backgroundColor: colores, borderWidth: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
    });
  }

  private renderGraficaCamiones(): void {
    if (!this.canvasCamiones || !this.viajesCamion?.length) return;

    const placas = this.viajesCamion.map(v => v.placas);
    const viajes = this.viajesCamion.map(v => v.totalViajes);
    const horas = this.viajesCamion.map(v => v.totalHorasFuera);

    if (this.chartCamiones) {
      this.chartCamiones.data.labels = placas;
      this.chartCamiones.data.datasets[0].data = viajes;
      this.chartCamiones.data.datasets[1].data = horas;
      this.chartCamiones.update();
      return;
    }

    this.chartCamiones = new Chart(this.canvasCamiones.nativeElement, {
      type: 'bar',
      data: {
        labels: placas,
        datasets: [
          {
            label: 'Número de viajes',
            data: viajes,
            backgroundColor: '#3B82F6',
            borderRadius: 4,
            yAxisID: 'y'
          },
          {
            label: 'Horas fuera (acumulado)',
            data: horas,
            backgroundColor: '#F59E0B',
            borderRadius: 4,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || '';
                const value = context.raw as number;
                if (context.dataset.label?.includes('Horas')) {
                  return `${label}: ${value.toFixed(1)} h`;
                }
                return `${label}: ${value}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Viajes', color: '#3B82F6' },
            ticks: { stepSize: 1 }
          },
          y1: {
            position: 'right',
            beginAtZero: true,
            title: { display: true, text: 'Horas fuera', color: '#F59E0B' },
            grid: { drawOnChartArea: false }
          }
        }
      }
    });
  }

  fmtHora(fechaIso: string): string {
    if (!fechaIso) return '—';
    const fechaUTC = new Date(fechaIso);
    const fechaLocal = new Date(fechaUTC.getTime() + (6 * 60 * 60 * 1000));
    return fechaLocal.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  formatMinutos(minutos: number): string {
    if (minutos == null) return '—';
    if (minutos < 60) return `${minutos} min`;
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    if (mins === 0) return `${horas} h`;
    return `${horas}:${mins.toString().padStart(2, '0')} h`;
  }

  parsearNumero(valor: any): number {
    if (!valor) return 0;
    // Quita cualquier carácter que no sea un dígito o un punto decimal
    const num = parseFloat(valor.toString().replace(/[^0-9.-]+/g, ''));
    return isNaN(num) ? 0 : num;
  }

  /**
   * Retorna el código de color según el nivel de combustible (cuartos).
   * 0-24% Rojo | 25-49% Naranja | 50-74% Amarillo | 75-100% Verde
   */
  obtenerColorCombustible(valor: any): string {
    const v = this.parsearNumero(valor);
    if (v < 25) return '#E53935'; // Rojo
    if (v < 50) return '#FB8C00'; // Naranja
    if (v < 75) return '#FBC02D'; // Amarillo
    return '#43A047';             // Verde
  }
}