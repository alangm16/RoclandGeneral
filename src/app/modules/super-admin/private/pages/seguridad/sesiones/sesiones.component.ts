import { Component, OnInit, OnDestroy, inject, signal, Injector, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, combineLatest } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';

import { LayoutService } from '../../../../../../core/services/layout.service';
import { SuperadminService } from '../../../../services/super-admin.service';
import { AuthService } from '../../../../../../core/auth/auth.service';
import { AlertService } from '../../../../../../shared/components/swal-alert/alert.service';
import { DataTableComponent, DataTableColumn } from '../../../../../../shared/components/data-table/data-table.component';
import { BadgeComponent } from '../../../../../../shared/components/badge/badge-component';
import { ProyectoListDto, SesionActivaDto, PagedResult, UsuarioListDto } from '../../../../models/superadmin.models';

@Component({
  selector: 'app-sesiones',
  standalone: true,
  imports: [CommonModule, DataTableComponent, MatMenuModule, MatButtonModule],
  templateUrl: './sesiones.component.html',
  styleUrls: ['./sesiones.component.scss']
})
export class SesionesComponent implements OnInit, OnDestroy {
  private layoutSvc = inject(LayoutService);
  private saSvc = inject(SuperadminService);
  private authSvc = inject(AuthService);
  private alert = inject(AlertService);
  private injector = inject(Injector);
  private destroy$ = new Subject<void>();

  // Permisos (solo SuperAdmin y Admin)
  puedeAdministrar = computed(() => {
    const rol = this.authSvc.proyectoActivo()?.rolEnProyecto;
    return rol === 'SuperAdmin' || rol === 'Admin';
  });

  // Datos principales
  sesiones = signal<SesionActivaDto[]>([]);
  totalRegistros = signal(0);
  cargando = signal(false);
  revocando = signal<number | null>(null); // id de sesión en proceso

  // Paginación
  paginaActual = signal(1);
  readonly porPagina = 15;
  totalPaginas = computed(() => Math.max(1, Math.ceil(this.totalRegistros() / this.porPagina)));

  // Listas para filtros
  proyectos = signal<ProyectoListDto[]>([]);
  usuarios = signal<UsuarioListDto[]>([]);

  // Columnas de la tabla
  columnas: DataTableColumn[] = [
    { key: 'username', label: 'USUARIO' },
    { key: 'proyectoCodigo', label: 'PROYECTO' },
    { key: 'plataforma', label: 'PLATAFORMA', cellClass: 'text-center' },
    { key: 'tokenReducido', label: 'TOKEN (sufijo)' },
    { key: 'fechaCreacion', label: 'CREACIÓN', cellClass: 'text-mono' },
    { key: 'fechaExpiracion', label: 'EXPIRACIÓN', cellClass: 'text-mono' },
    { key: 'ipCreacion', label: 'IP', cellClass: 'text-mono' },
    { key: 'acciones', label: '', cellClass: 'text-end' }
  ];

  ngOnInit(): void {
    if (!this.puedeAdministrar()) {
      this.alert.error('No tiene permisos para acceder a esta sección');
      return;
    }

    this.configurarSubheader();
    this.cargarProyectos();
    this.cargarUsuarios();

    // Reacción a cambios en filtros
    combineLatest([
      toObservable(this.layoutSvc.filterValues, { injector: this.injector }),
      toObservable(this.layoutSvc.searchValue, { injector: this.injector })
    ]).pipe(
      debounceTime(400),
      distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.paginaActual.set(1);
      this.cargarSesiones();
    });

    this.cargarSesiones();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.layoutSvc.resetSubheader();
  }

  private configurarSubheader(): void {
    this.layoutSvc.setSubheader({
      title: 'Sesiones Activas',
      showSearch: true,
      searchPlaceholder: 'Buscar por usuario...',
      filters: [
        {
          type: 'select',
          key: 'usuarioId',
          placeholder: 'Todos los usuarios',
          options: [] // se llenará dinámicamente
        },
        {
          type: 'select',
          key: 'proyectoId',
          placeholder: 'Todos los proyectos',
          options: [] // se llenará dinámicamente
        }
      ],
      actions: [
        {
          label: 'Limpiar filtros',
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
          this.actualizarOpcionesFiltro('proyectoId', options);
        },
        error: () => this.alert.error('No se pudieron cargar los proyectos')
      });
  }

  private cargarUsuarios(): void {
    this.saSvc.getUsuarios(1, 500, false, undefined) // traer muchos usuarios para el filtro
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.usuarios.set(res.items);
          const options = res.items.map(u => ({ label: `${u.nombreCompleto} (${u.username})`, value: u.id.toString() }));
          this.actualizarOpcionesFiltro('usuarioId', options);
        },
        error: () => this.alert.error('No se pudieron cargar los usuarios')
      });
  }

  private actualizarOpcionesFiltro(key: string, options: { label: string; value: string }[]): void {
    const currentFilters = this.layoutSvc.subheaderFilters();
    const idx = currentFilters.findIndex(f => f.key === key);
    if (idx !== -1) {
      const updated = [...currentFilters];
      updated[idx] = { ...updated[idx], options };
      this.layoutSvc.subheaderFilters.set(updated);
    }
  }

  private cargarSesiones(): void {
    this.cargando.set(true);
    const filtros = {
      usuarioId: this.layoutSvc.filterValues()['usuarioId'] ? +this.layoutSvc.filterValues()['usuarioId'] : undefined,
      proyectoId: this.layoutSvc.filterValues()['proyectoId'] ? +this.layoutSvc.filterValues()['proyectoId'] : undefined,
      pagina: this.paginaActual(),
      tamanoPagina: this.porPagina
    };

    this.saSvc.getSesiones(filtros)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: PagedResult<SesionActivaDto>) => {
          this.sesiones.set(res.items);
          this.totalRegistros.set(res.totalRegistros);
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.alert.error('Error al cargar las sesiones activas');
        }
      });
  }

  limpiarFiltros(): void {
    this.layoutSvc.searchValue.set('');
    this.layoutSvc.filterValues.set({});
    this.paginaActual.set(1);
    this.cargarSesiones();
  }

  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas()) {
      this.paginaActual.set(pagina);
      this.cargarSesiones();
    }
  }

  async revocarSesion(sesion: SesionActivaDto): Promise<void> {
    if (!this.puedeAdministrar()) return;

    const confirmado = await this.alert.confirmar({
      titulo: 'Revocar sesión',
      texto: `¿Está seguro de revocar la sesión del usuario ${sesion.username}? El usuario deberá autenticarse nuevamente.`,
      labelConfirmar: 'Sí, revocar',
      labelCancelar: 'Cancelar'
    });
    if (!confirmado) return;

    this.revocando.set(sesion.id);
    this.saSvc.revocarSesion(sesion.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.revocando.set(null);
          this.alert.exito('Sesión revocada correctamente');
          this.cargarSesiones(); // recargar la lista
        },
        error: () => {
          this.revocando.set(null);
          this.alert.error('No se pudo revocar la sesión');
        }
      });
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
}