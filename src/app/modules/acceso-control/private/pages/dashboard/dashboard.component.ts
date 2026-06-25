import {
  Component, OnInit, inject, ViewChild, ElementRef,
  OnDestroy, effect, PLATFORM_ID, computed
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Chart from 'chart.js/auto';
import { AdminService } from '../../../services/admin.service';
import { DashboardKpis, AccesoActivoResponse } from '../../../models/admin.models';
import { SignalrService, SignalRStatus } from '../../../services/signalr.service';
import { Subscription, interval } from 'rxjs';
import { environment } from '../../../../../../environments/Environment';
import { LayoutService } from '../../../../../core/services/layout.service';
import { AuthService } from '../../../../../core/auth/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: 'dashboard.component.html',
  styleUrls: ['dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly adminService  = inject(AdminService);
  private readonly signalrService = inject(SignalrService);
  private readonly layoutService  = inject(LayoutService);
  private readonly platformId     = inject(PLATFORM_ID);
  private authSvc = inject(AuthService);

  conexionStatus: SignalRStatus = 'disconnected';
  private subs: Subscription = new Subscription();

  kpis: DashboardKpis | null = null;
  visitantesDentro: AccesoActivoResponse[] = [];
  proveedoresDentro: AccesoActivoResponse[] = [];
  internosDentro: AccesoActivoResponse[] = [];
  
  anioActual: number = new Date().getFullYear();
  mesActual:  number = new Date().getMonth() + 1;
  aniosDisponibles: number[] = [this.anioActual, this.anioActual - 1, this.anioActual - 2];
  mesesDisponibles = [
    { id: 1, nombre: 'Enero' },    { id: 2, nombre: 'Febrero' },
    { id: 3, nombre: 'Marzo' },    { id: 4, nombre: 'Abril' },
    { id: 5, nombre: 'Mayo' },     { id: 6, nombre: 'Junio' },
    { id: 7, nombre: 'Julio' },    { id: 8, nombre: 'Agosto' },
    { id: 9, nombre: 'Septiembre' },{ id: 10, nombre: 'Octubre' },
    { id: 11, nombre: 'Noviembre' },{ id: 12, nombre: 'Diciembre' }
  ];

  @ViewChild('canvasHoras', { static: false }) canvasHoras!: ElementRef;
  @ViewChild('canvasAreas', { static: false }) canvasAreas!: ElementRef;
  @ViewChild('canvasMes',   { static: false }) canvasMes!: ElementRef;

  private chartHoras: Chart | null = null;
  private chartAreas: Chart | null = null;
  private chartMes:   Chart | null = null;

  currentTime: string = '';
  private clockInterval: any;
  private resizeObservers: ResizeObserver[] = [];

  // ── INE inline ────────────────────────────────────────────────────────────
  fotoActivaUrl: string | null = null;
  fotoLoadingId: number | null = null;
  private fotoCache = new Map<number, string>(); // caché para no re-pedir la misma foto

  puedeVer = computed(() => {
    const rol = this.authSvc.proyectoActivo()?.rolEnProyecto;
    return rol === 'Gerente';
  });

  constructor() {
    effect(() => {
      const _collapsed = this.layoutService.sidebarCollapsed();
      setTimeout(() => {
        this.chartHoras?.resize();
        this.chartAreas?.resize();
        this.chartMes?.resize();
      }, 250);
    });
  }

  ngOnInit(): void {
    // ── Registrar handlers de exportar en el subheader ──
    this.layoutService.setSubheader({
      title: 'Dashboard',
      showSearch: false,
      showExport: true,
      exportHandlers: {
        excel: () => this.descargarExcel(),
        pdf:   () => this.descargarPdf(),
      },
    });

    if (isPlatformBrowser(this.platformId)) {
      this.cargarDatos();
      this.configurarSignalR();
      this.iniciarReloj();
    }
  }

  ngOnDestroy(): void {
    this.chartHoras?.destroy();
    this.chartAreas?.destroy();
    this.chartMes?.destroy();
    this.subs.unsubscribe();
    this.signalrService.detenerConexion();
    this.detenerReloj();
    this.resizeObservers.forEach(o => o.disconnect());
    this.resizeObservers = [];
    this.layoutService.resetSubheader();
    this.fotoCache.forEach(url => URL.revokeObjectURL(url));
    this.fotoCache.clear();
  }

  private configurarSignalR(): void {
    this.signalrService.iniciarConexion();
    this.subs.add(this.signalrService.status$.subscribe(s => this.conexionStatus = s));
    this.subs.add(this.signalrService.nuevaSolicitud$.subscribe(() => this.cargarKpis()));
    this.subs.add(this.signalrService.solicitudResuelta$.subscribe(() => {
      this.cargarKpis();
      this.cargarActivos();
      this.cargarGraficaHoras();
    }));
    this.subs.add(this.signalrService.salidaRegistrada$.subscribe(() => {
      this.cargarKpis();
      this.cargarActivos();
    }));
    this.subs.add(interval(30000).subscribe(() => {
      if (!this.signalrService.isConnected) this.cargarKpis();
    }));
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
      next:  d => this.kpis = d,
      error: e => console.error('Error cargando KPIs', e)
    });
  }

  cargarActivos(): void {
    this.adminService.getActivosZona().subscribe({
      next: d => {

        this.visitantesDentro = d.filter(
          a => a.categoriaVisual === 'externo' &&
              a.tipoRegistro === 'Visitante'
        );

        this.proveedoresDentro = d.filter(
          a => a.categoriaVisual === 'externo' &&
              a.tipoRegistro === 'Proveedor'
        );

        this.internosDentro = d.filter(
          a => a.categoriaVisual !== 'externo'
        );
      },
      error: e => console.error('Error cargando activos', e)
    });
  }

  // ── Exportar ──────────────────────────────────────────────────────────────
  descargarExcel() {
    this.adminService.exportarExcel().subscribe({
      next: (blob: Blob) => {
        // 1. Creamos una URL local en la memoria del navegador para el archivo
        const url = window.URL.createObjectURL(blob);
        
        // 2. Creamos una etiqueta <a> invisible
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Reporte_Acceso_Control.xlsx'; // Nombre del archivo a guardar
        
        // 3. Simulamos el clic y limpiamos la memoria
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Error al descargar Excel', err);
        // Aquí puedes mostrar un Toast o Snackbar de error
      }
    });
  }

  descargarPdf() {
    this.adminService.exportarPdf().subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Reporte_Acceso_Control.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Error al descargar PDF', err);
      }
    });
  }

  // ── Reloj ─────────────────────────────────────────────────────────────────
  private iniciarReloj(): void {
    this.updateClock();
    this.clockInterval = setInterval(() => this.updateClock(), 1000);
  }
  private detenerReloj(): void { if (this.clockInterval) clearInterval(this.clockInterval); }
  private updateClock(): void {
    this.currentTime = new Date().toLocaleTimeString('es-MX', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }

  // ── Gráficas ──────────────────────────────────────────────────────────────
  private observeChartResize(chart: Chart, container: HTMLElement): void {
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(container);
    this.resizeObservers.push(observer);
  }

  cargarGraficaHoras(): void {
    this.adminService.getFlujoHoras().subscribe(data => {
      const filtrados = data
        .filter(d => d.hora >= 7 && d.hora <= 19)
        .sort((a, b) => a.hora - b.hora);

      const labels  = filtrados.map(d => d.hora + ':00');
      const valores = filtrados.map(d => d.total);

      if (this.chartHoras) {
        this.chartHoras.data.labels = labels;
        this.chartHoras.data.datasets[0].data = valores;
        this.chartHoras.update();
        return;
      }

      setTimeout(() => {
        if (!this.canvasHoras) return;
        const canvas = this.canvasHoras.nativeElement;
        this.chartHoras = new Chart(canvas, {
          type: 'bar',
          data: {
            labels,
            datasets: [{
              label: 'Accesos',
              data: valores,
              backgroundColor: '#3B82F6BB',
              borderColor: '#3B82F6',
              borderWidth: 1,
              borderRadius: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  stepSize: 1,
                  callback: v => Number.isInteger(v) ? v : null
                },
                suggestedMax: 10
              }
            }
          }
        });
        this.observeChartResize(this.chartHoras, canvas.parentElement!);
      }, 0);
    });
  }

  cargarGraficaAreas(): void {
    this.adminService.getAreasRanking().subscribe(data => {
      const labels  = data.map(d => d.area);
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
        const canvas = this.canvasAreas.nativeElement;
        this.chartAreas = new Chart(canvas, {
          type: 'doughnut',
          data: {
            labels,
            datasets: [{ data: valores, backgroundColor: bgColors, borderWidth: 2, borderColor: '#ffffff' }]
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
        });
        this.observeChartResize(this.chartAreas, canvas.parentElement!);
      }, 0);
    });
  }

  cargarGraficaMes(): void {
    this.adminService.getFlujoDiario(this.anioActual, this.mesActual).subscribe(data => {
      const labels = data.map(d => d.fecha);
      const valVisitantes = data.map(d => d.visitantes);
      const valProveedores = data.map(d => d.proveedores);
      const valColaboradores = data.map(d => d.colaboradores);

      if (this.chartMes) {
        this.chartMes.data.labels = labels;
        this.chartMes.data.datasets[0].data = valVisitantes;
        this.chartMes.data.datasets[1].data = valProveedores;
        this.chartMes.data.datasets[2].data = valColaboradores;
        this.chartMes.update();
        return;
      }
      setTimeout(() => {
        if (!this.canvasMes) return;
        const canvas = this.canvasMes.nativeElement;
        this.chartMes = new Chart(canvas, {
          type: 'line',
          data: {
            labels,
            datasets: [
              { label: 'Visitantes',  data: valVisitantes,  borderColor: '#3B82F6', backgroundColor: '#3B82F622', fill: true, tension: 0.4 },
              { label: 'Proveedores', data: valProveedores, borderColor: '#8B5CF6', backgroundColor: '#8B5CF622', fill: true, tension: 0.4 },
              { label: 'Colaboradores', data: valColaboradores, borderColor: '#0D9488', backgroundColor: '#0D948822', fill: true, tension: 0.4 }
            ]
          },
          options: { responsive: true, maintainAspectRatio: false }
        });
        this.observeChartResize(this.chartMes, canvas.parentElement!);
      }, 0);
    });
  }

  fmtHora(fechaIso: string): string {
    if (!fechaIso) return 'Sin registro';

    const fechaSinZ = fechaIso.replace('Z', '');

    const fecha = new Date(fechaSinZ);
    
    return fecha.toLocaleTimeString('es-MX', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: true 
    });
  }

  toggleFotoCard(registroId: number, event: MouseEvent): void {
    event.stopPropagation(); // evitar que dispare el popup hover

    // Si ya está abierta la misma, la cierra
    if (this.fotoActivaUrl && this.fotoLoadingId === null) {
      this.cerrarFotoCard();
      return;
    }

    // Buscar la persona en los activos para obtener su id de persona
    const persona = [
      ...this.visitantesDentro,
      ...this.proveedoresDentro,
      ...this.internosDentro
    ].find(a => a.registroId === registroId);

    if (!persona) return;

    // Necesitamos el personaId — lo obtenemos del perfil de la persona
    // Primero revisamos caché
    const cached = this.fotoCache.get(registroId);
    if (cached) {
      this.fotoActivaUrl = cached;
      return;
    }

    this.fotoLoadingId = registroId;

    // Buscamos el personaId via el historial o el perfil usando el número de identificación
    // AccesoActivoResponse no trae personaId directamente, así que usamos la búsqueda por nombre
    this.adminService.getPersonas(1, 1, persona.nombrePersona).subscribe({
      next: (res) => {
        const match = res.items[0];
        if (!match) {
          this.fotoLoadingId = null;
          return;
        }
        this.adminService.getFotoPersona(match.id).subscribe({
          next: (blob) => {
            const url = URL.createObjectURL(blob);
            this.fotoCache.set(registroId, url);
            this.fotoActivaUrl = url;
            this.fotoLoadingId = null;
          },
          error: () => { this.fotoLoadingId = null; }
        });
      },
      error: () => { this.fotoLoadingId = null; }
    });
  }

  cerrarFotoCard(): void {
    this.fotoActivaUrl = null;
  }
}