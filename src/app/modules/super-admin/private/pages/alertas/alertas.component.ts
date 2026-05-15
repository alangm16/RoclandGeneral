import { Component, OnInit, OnDestroy, inject, signal, Injector, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, combineLatest } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';

import { LayoutService } from '../../../../../core/services/layout.service';
import { SuperadminService } from '../../../services/super-admin.service';
import { AuthService } from '../../../../../core/auth/auth.service';
import { AlertService } from '../../../../../shared/components/swal-alert/alert.service';
import { DataTableComponent, DataTableColumn } from '../../../../../shared/components/data-table/data-table.component';
import { BadgeComponent } from '../../../../../shared/components/badge/badge-component';
import { ProyectoListDto, AlertaDto, PagedResult } from '../../../models/superadmin.models';

@Component({
  selector: 'app-alertas',
  standalone: true,
  imports: [CommonModule, DataTableComponent, BadgeComponent, MatButtonModule, MatMenuModule],
  templateUrl: './alertas.component.html',
  styleUrls: ['./alertas.component.scss']
})
export class AlertasComponent implements OnInit, OnDestroy {
  private layoutSvc = inject(LayoutService);
  private saSvc = inject(SuperadminService);
  private authSvc = inject(AuthService);
  private alert = inject(AlertService);
  private router = inject(Router);
  private injector = inject(Injector);
  private destroy$ = new Subject<void>();

  // Permisos (solo SuperAdmin y Admin pueden resolver alertas)
  puedeResolver = computed(() => {
    const rol = this.authSvc.proyectoActivo()?.rolEnProyecto;
    return rol === 'SuperAdmin' || rol === 'Admin';
  });

  // Datos principales
  alertas = signal<AlertaDto[]>([]);
  totalRegistros = signal(0);
  cargando = signal(false);
  resolviendo = signal<number | null>(null);

  // Paginación
  paginaActual = signal(1);
  readonly porPagina = 20;
  totalPaginas = computed(() => Math.max(1, Math.ceil(this.totalRegistros() / this.porPagina)));

  // Lista de proyectos para el filtro
  proyectos = signal<ProyectoListDto[]>([]);

  // Opciones predefinidas para filtros
  tiposOpciones = [
    { label: 'Crítica', value: 'critical' },
    { label: 'Error', value: 'error' },
    { label: 'Advertencia', value: 'warning' },
    { label: 'Informativa', value: 'info' }
  ];

  estadoOpciones = [
    { label: 'Todas', value: '' },
    { label: 'Resueltas', value: 'true' },
    { label: 'Pendientes', value: 'false' }
  ];

  // Columnas de la tabla
  columnas: DataTableColumn[] = [
    { key: 'tipo', label: 'TIPO', cellClass: 'text-center' },
    { key: 'titulo', label: 'TÍTULO' },
    { key: 'mensaje', label: 'MENSAJE' },
    { key: 'proyectoCodigo', label: 'PROYECTO' },
    { key: 'fecha', label: 'FECHA', cellClass: 'text-mono' },
    { key: 'resuelta', label: 'ESTADO', cellClass: 'text-center' },
    { key: 'acciones', label: '', cellClass: 'text-end' }
  ];

  ngOnInit(): void {
    this.configurarSubheader();
    this.cargarProyectos();

    // Reacción a cambios en filtros y búsqueda
    combineLatest([
      toObservable(this.layoutSvc.filterValues, { injector: this.injector }),
      toObservable(this.layoutSvc.searchValue, { injector: this.injector })
    ]).pipe(
      debounceTime(400),
      distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.paginaActual.set(1);
      this.cargarAlertas();
    });

    this.cargarAlertas();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.layoutSvc.resetSubheader();
  }

  private configurarSubheader(): void {
    this.layoutSvc.setSubheader({
      title: 'Alertas del Sistema',
      showSearch: true,
      searchPlaceholder: 'Buscar por título o mensaje...',
      filters: [
        {
          type: 'select',
          key: 'proyectoId',
          placeholder: 'Todos los proyectos',
          options: []
        },
        {
          type: 'select',
          key: 'tipo',
          placeholder: 'Todos los tipos',
          options: this.tiposOpciones
        },
        {
          type: 'select',
          key: 'resuelta',
          placeholder: 'Todas',
          options: this.estadoOpciones
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
  }

  private cargarProyectos(): void {
    this.saSvc.getProyectos()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (proyectos) => {
          this.proyectos.set(proyectos);
          const options = proyectos.map(p => ({ label: `${p.nombre} (${p.codigo})`, value: p.id.toString() }));
          const currentFilters = this.layoutSvc.subheaderFilters();
          const idx = currentFilters.findIndex(f => f.key === 'proyectoId');
          if (idx !== -1) {
            const updated = [...currentFilters];
            updated[idx] = { ...updated[idx], options };
            this.layoutSvc.subheaderFilters.set(updated);
          }
        },
        error: () => this.alert.error('No se pudieron cargar los proyectos')
      });
  }

  private cargarAlertas(): void {
    this.cargando.set(true);
    const filtros = {
      proyectoId: this.layoutSvc.filterValues()['proyectoId'] ? +this.layoutSvc.filterValues()['proyectoId'] : undefined,
      tipo: this.layoutSvc.filterValues()['tipo'] || undefined,
      resuelta: this.layoutSvc.filterValues()['resuelta'] ? this.layoutSvc.filterValues()['resuelta'] === 'true' : undefined,
      desde: this.layoutSvc.filterValues()['desde'] || undefined,
      hasta: this.layoutSvc.filterValues()['hasta'] || undefined,
      pagina: this.paginaActual(),
      tamanoPagina: this.porPagina
    };

    this.saSvc.getAlertas(filtros.resuelta, filtros.tipo, this.paginaActual(), this.porPagina)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: PagedResult<AlertaDto>) => {
          this.alertas.set(res.items);
          this.totalRegistros.set(res.totalRegistros);
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.alert.error('Error al cargar las alertas');
        }
      });
  }

  ejecutarBusqueda(): void {
    this.paginaActual.set(1);
    this.cargarAlertas();
  }

  limpiarFiltros(): void {
    this.layoutSvc.searchValue.set('');
    this.layoutSvc.filterValues.set({});
    this.paginaActual.set(1);
    this.cargarAlertas();
  }

  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas()) {
      this.paginaActual.set(pagina);
      this.cargarAlertas();
    }
  }

  async marcarResuelta(alerta: AlertaDto): Promise<void> {
    if (!this.puedeResolver()) return;
    if (alerta.resuelta) {
      this.alert.advertencia('Esta alerta ya está resuelta.');
      return;
    }

    const confirmado = await this.alert.confirmar({
      titulo: 'Marcar como resuelta',
      texto: `¿Desea marcar la alerta "${alerta.titulo}" como resuelta?`,
      labelConfirmar: 'Sí, resolver',
      labelCancelar: 'Cancelar'
    });
    if (!confirmado) return;

    this.resolviendo.set(alerta.id);
    this.saSvc.marcarAlertaResuelta(alerta.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.resolviendo.set(null);
          this.alert.exito('Alerta marcada como resuelta');
          this.cargarAlertas(); // recargar lista
        },
        error: () => {
          this.resolviendo.set(null);
          this.alert.error('No se pudo resolver la alerta');
        }
      });
  }

  irAccion(alerta: AlertaDto): void {
    if (alerta.accionUrl) {
      // Si la URL es externa, abrir en nueva pestaña
      if (alerta.accionUrl.startsWith('http')) {
        window.open(alerta.accionUrl, '_blank');
      } else {
        // Navegación interna
        this.router.navigateByUrl(alerta.accionUrl);
      }
    }
  }

  getTipoVariant(tipo: string): 'red' | 'amber' | 'blue' | 'gray' {
    switch (tipo) {
      case 'critical': return 'red';
      case 'error': return 'red';
      case 'warning': return 'amber';
      case 'info': return 'blue';
      default: return 'gray';
    }
  }

  getTipoLabel(tipo: string): string {
    switch (tipo) {
      case 'critical': return 'Crítica';
      case 'error': return 'Error';
      case 'warning': return 'Advertencia';
      case 'info': return 'Informativa';
      default: return tipo;
    }
  }

  formatDateTime(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}