import { Component, OnInit, OnDestroy, inject, signal, Injector, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, combineLatest } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';

import { LayoutService } from '../../../../../../core/services/layout.service';
import { SuperadminService } from '../../../../services/super-admin.service';
import { AuthService } from '../../../../../../core/auth/auth.service';
import { AlertService } from '../../../../../../shared/components/swal-alert/alert.service';
import { DataTableComponent, DataTableColumn } from '../../../../../../shared/components/data-table/data-table.component';
import { BadgeComponent } from '../../../../../../shared/components/badge/badge-component';
import { ProyectoListDto, LogAccesoDto, PagedResult } from '../../../../models/superadmin.models';

@Component({
  selector: 'app-logs-acceso',
  standalone: true,
  imports: [CommonModule, DataTableComponent, BadgeComponent],
  templateUrl: './logs-acceso.component.html',
  styleUrls: ['./logs-acceso.component.scss']
})
export class LogsAccesoComponent implements OnInit, OnDestroy {
  private layoutSvc = inject(LayoutService);
  private saSvc = inject(SuperadminService);
  private authSvc = inject(AuthService);
  private alert = inject(AlertService);
  private injector = inject(Injector);
  private destroy$ = new Subject<void>();

  // Permisos (auditoría visible para SuperAdmin, Admin, Auditor)
  puedeVer = computed(() => {
    const rol = this.authSvc.proyectoActivo()?.rolEnProyecto;
    return rol === 'SuperAdmin' || rol === 'Admin' || rol === 'Auditor';
  });

  // Datos principales
  logs = signal<LogAccesoDto[]>([]);
  totalRegistros = signal(0);
  cargando = signal(false);

  // Paginación
  paginaActual = signal(1);
  readonly porPagina = 20;
  totalPaginas = computed(() => Math.max(1, Math.ceil(this.totalRegistros() / this.porPagina)));

  // Lista de proyectos para el filtro
  proyectos = signal<ProyectoListDto[]>([]);

  // Columnas de la tabla
  columnas: DataTableColumn[] = [
    { key: 'fecha', label: 'FECHA', headerClass: 'col-fecha', cellClass: 'text-mono' },
    { key: 'usernameUsado', label: 'USUARIO' },
    { key: 'nombreCompleto', label: 'NOMBRE COMPLETO' },
    { key: 'proyectoCodigo', label: 'PROYECTO' },
    { key: 'plataforma', label: 'PLATAFORMA' },
    { key: 'exitoso', label: 'RESULTADO', cellClass: 'text-center' },
    { key: 'ipAddress', label: 'IP', cellClass: 'text-mono' },
    { key: 'detalle', label: 'DETALLE' }
  ];

  ngOnInit(): void {
    if (!this.puedeVer()) {
      this.alert.error('No tiene permisos para acceder a esta sección');
      return;
    }

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
      this.cargarLogs();
    });

    this.cargarLogs();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.layoutSvc.resetSubheader();
  }

  private configurarSubheader(): void {
    this.layoutSvc.setSubheader({
      title: 'Logs de Acceso',
      showSearch: true,
      searchPlaceholder: 'Buscar por usuario o IP...',
      filters: [
        {
          type: 'select',
          key: 'proyectoCodigo',
          placeholder: 'Todos los proyectos',
          options: [] // se llenará dinámicamente
        },
        {
          type: 'select',
          key: 'plataforma',
          placeholder: 'Todas las plataformas',
          options: [
            { label: 'Web', value: 'Web' },
            { label: 'Mobile', value: 'Mobile' },
            { label: 'Desktop', value: 'Desktop' }
          ]
        },
        {
          type: 'select',
          key: 'exitoso',
          placeholder: 'Todos los resultados',
          options: [
            { label: 'Exitoso', value: 'true' },
            { label: 'Fallido', value: 'false' }
          ]
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
          const options = proyectos.map(p => ({ label: `${p.nombre} (${p.codigo})`, value: p.codigo }));
          const currentFilters = this.layoutSvc.subheaderFilters();
          const idx = currentFilters.findIndex(f => f.key === 'proyectoCodigo');
          if (idx !== -1) {
            const updated = [...currentFilters];
            updated[idx] = { ...updated[idx], options };
            this.layoutSvc.subheaderFilters.set(updated);
          }
        },
        error: () => this.alert.error('No se pudieron cargar los proyectos')
      });
  }

  private cargarLogs(): void {
    this.cargando.set(true);
    const filtros = {
      username: this.layoutSvc.searchValue().trim() || undefined,
      proyectoCodigo: this.layoutSvc.filterValues()['proyectoCodigo'] || undefined,
      plataforma: this.layoutSvc.filterValues()['plataforma'] || undefined,
      exitoso: this.layoutSvc.filterValues()['exitoso'] ? this.layoutSvc.filterValues()['exitoso'] === 'true' : undefined,
      desde: this.layoutSvc.filterValues()['desde'] || undefined,
      hasta: this.layoutSvc.filterValues()['hasta'] || undefined
    };

    this.saSvc.getLogsAcceso(filtros, this.paginaActual(), this.porPagina)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: PagedResult<LogAccesoDto>) => {
          this.logs.set(res.items);
          this.totalRegistros.set(res.totalRegistros);
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.alert.error('Error al cargar los logs de acceso');
        }
      });
  }

  ejecutarBusqueda(): void {
    this.paginaActual.set(1);
    this.cargarLogs();
  }

  limpiarFiltros(): void {
    this.layoutSvc.searchValue.set('');
    this.layoutSvc.filterValues.set({});
    this.paginaActual.set(1);
    this.cargarLogs();
  }

  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas()) {
      this.paginaActual.set(pagina);
      this.cargarLogs();
    }
  }

  // Helpers de formato
  formatDateTime(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  getResultadoVariant(exitoso: boolean): 'green' | 'red' {
    return exitoso ? 'green' : 'red';
  }
}