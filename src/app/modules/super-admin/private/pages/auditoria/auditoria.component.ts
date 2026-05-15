import { Component, OnInit, OnDestroy, inject, signal, Injector, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, combineLatest } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';

import { LayoutService } from '../../../../../core/services/layout.service';
import { SuperadminService } from '../../../services/super-admin.service';
import { AuthService } from '../../../../../core/auth/auth.service';
import { AlertService } from '../../../../../shared/components/swal-alert/alert.service';
import { DataTableComponent, DataTableColumn } from '../../../../../shared/components/data-table/data-table.component';
import { BadgeComponent } from '../../../../../shared/components/badge/badge-component';
import { AuditoriaDto, PagedResult } from '../../../models/superadmin.models';

@Component({
  selector: 'app-auditoria',
  standalone: true,
  imports: [CommonModule, DataTableComponent, BadgeComponent],
  templateUrl: './auditoria.component.html',
  styleUrls: ['./auditoria.component.scss']
})
export class AuditoriaComponent implements OnInit, OnDestroy {
  private layoutSvc = inject(LayoutService);
  private saSvc = inject(SuperadminService);
  private authSvc = inject(AuthService);
  private alert = inject(AlertService);
  private injector = inject(Injector);
  private destroy$ = new Subject<void>();

  // Permisos (visible para SuperAdmin, Admin, Auditor)
  puedeVer = computed(() => {
    const rol = this.authSvc.proyectoActivo()?.rolEnProyecto;
    return rol === 'SuperAdmin' || rol === 'Admin' || rol === 'Auditor';
  });

  // Datos principales
  registros = signal<AuditoriaDto[]>([]);
  totalRegistros = signal(0);
  cargando = signal(false);

  // Paginación
  paginaActual = signal(1);
  readonly porPagina = 20;
  totalPaginas = computed(() => Math.max(1, Math.ceil(this.totalRegistros() / this.porPagina)));

  // Columnas de la tabla
  columnas: DataTableColumn[] = [
    { key: 'fecha', label: 'FECHA', cellClass: 'text-mono' },
    { key: 'usuarioResponsable', label: 'USUARIO' },
    { key: 'accion', label: 'ACCIÓN' },
    { key: 'nombreEntidad', label: 'ENTIDAD' },
    { key: 'entidadAfectada', label: 'DETALLE' },
    { key: 'registroId', label: 'ID REGISTRO', cellClass: 'text-center text-mono' }
  ];

  ngOnInit(): void {
    if (!this.puedeVer()) {
      this.alert.error('No tiene permisos para acceder a esta sección');
      return;
    }

    this.configurarSubheader();

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
      this.cargarAuditoria();
    });

    this.cargarAuditoria();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.layoutSvc.resetSubheader();
  }

  private configurarSubheader(): void {
    this.layoutSvc.setSubheader({
      title: 'Auditoría Global',
      showSearch: true,
      searchPlaceholder: 'Buscar usuario responsable...',
      filters: [
        {
          type: 'select',
          key: 'entidad',
          placeholder: 'Todas las entidades',
          options: [
            { label: 'Usuario', value: 'Usuario' },
            { label: 'Proyecto', value: 'Proyecto' },
            { label: 'ProyectoUsuarioRol', value: 'ProyectoUsuarioRol' },
            { label: 'UsuarioVistaAcceso', value: 'UsuarioVistaAcceso' }
          ]
        },
        {
          type: 'select',
          key: 'accion',
          placeholder: 'Todas las acciones',
          options: [
            { label: 'Creación', value: 'Creación' },
            { label: 'Modificación', value: 'Modificación' }
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

  private cargarAuditoria(): void {
    this.cargando.set(true);
    const filtros = {
      usuario: this.layoutSvc.searchValue().trim() || undefined,
      entidad: this.layoutSvc.filterValues()['entidad'] || undefined,
      accion: this.layoutSvc.filterValues()['accion'] || undefined,
      desde: this.layoutSvc.filterValues()['desde'] || undefined,
      hasta: this.layoutSvc.filterValues()['hasta'] || undefined,
      pagina: this.paginaActual(),
      tamanoPagina: this.porPagina
    };

    this.saSvc.getAuditoria(filtros)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: PagedResult<AuditoriaDto>) => {
          this.registros.set(res.items);
          this.totalRegistros.set(res.totalRegistros);
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.alert.error('Error al cargar el registro de auditoría');
        }
      });
  }

  ejecutarBusqueda(): void {
    this.paginaActual.set(1);
    this.cargarAuditoria();
  }

  limpiarFiltros(): void {
    this.layoutSvc.searchValue.set('');
    this.layoutSvc.filterValues.set({});
    this.paginaActual.set(1);
    this.cargarAuditoria();
  }

  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas()) {
      this.paginaActual.set(pagina);
      this.cargarAuditoria();
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
      minute: '2-digit'
    });
  }

  getAccionVariant(accion: string): 'green' | 'blue' | 'amber' {
    switch (accion) {
      case 'Creación': return 'green';
      case 'Modificación': return 'amber';
      default: return 'blue';
    }
  }
}