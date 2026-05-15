// usuarios-proyecto.component.ts
import { Component, OnInit, OnDestroy, inject, signal, Injector, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, filter } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';

import { LayoutService } from '../../../../../../core/services/layout.service';
import { SuperadminService } from '../../../../services/super-admin.service';
import { AuthService } from '../../../../../../core/auth/auth.service';
import { AlertService } from '../../../../../../shared/components/swal-alert/alert.service';
import { DataTableComponent, DataTableColumn } from '../../../../../../shared/components/data-table/data-table.component';
import { ModalComponent } from '../../../../../../shared/components/modal/modal.component';
import { BadgeComponent } from '../../../../../../shared/components/badge/badge-component';

import {
  ProyectoListDto,
  UsuarioProyectoDto,
  RolDto,
  AsignarProyectoRolRequest,
  UsuarioListDto,
  PagedResult
} from '../../../../models/superadmin.models';

@Component({
  selector: 'app-usuarios-proyecto',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatMenuModule,
    MatSelectModule,
    DataTableComponent,
    ModalComponent,
    BadgeComponent
  ],
  templateUrl: './usuarios-proyecto.component.html',
  styleUrls: ['./usuarios-proyecto.component.scss']
})
export class UsuariosProyectoComponent implements OnInit, OnDestroy {
  private layoutSvc = inject(LayoutService);
  private saSvc = inject(SuperadminService);
  private fb = inject(FormBuilder);
  private alert = inject(AlertService);
  private authSvc = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private injector = inject(Injector);
  private destroy$ = new Subject<void>();

  // Permisos
  puedeAdministrar = computed(() => {
    const rol = this.authSvc.proyectoActivo()?.rolEnProyecto;
    return rol === 'SuperAdmin' || rol === 'Admin';
  });

  // Proyectos disponibles
  proyectos = signal<ProyectoListDto[]>([]);
  proyectoSeleccionado = signal<ProyectoListDto | null>(null);
  private proyectosCargados = false; // bandera para cargar proyectos una sola vez

  // Listado de usuarios asignados
  usuariosAsignados = signal<UsuarioProyectoDto[]>([]);
  cargando = signal(false);
  paginacion = signal({ pagina: 1, tamanoPagina: 10, totalRegistros: 0 });

  // Modal Asignar usuario
  modalAsignarAbierto = signal(false);
  usuariosDisponibles = signal<UsuarioListDto[]>([]);
  rolesProyecto = signal<RolDto[]>([]);
  asignarForm: FormGroup;

  // Modal Cambiar rol
  modalCambiarRolAbierto = signal(false);
  usuarioSeleccionado = signal<UsuarioProyectoDto | null>(null);
  nuevoRolId = signal<number | null>(null);
  rolesDisponibles = signal<RolDto[]>([]);

  // Columnas de la tabla
  columnas: DataTableColumn[] = [
    { key: 'nombreCompleto', label: 'USUARIO' },
    { key: 'username', label: 'USUERNAME' },
    { key: 'rol', label: 'ROL' },
    { key: 'nivelRol', label: 'NIVEL', cellClass: 'text-center' },
    { key: 'activo', label: 'ESTADO', cellClass: 'text-center' },
    { key: 'creadoPor', label: 'CREADO POR' },
    { key: 'fechaAsignacion', label: 'FECHA ASIGNACIÓN' },
    { key: 'acciones', label: '', cellClass: 'text-end' }
  ];

  constructor() {
    this.asignarForm = this.fb.group({
      usuarioId: [null, Validators.required],
      rolId: [null, Validators.required]
    });
  }

  ngOnInit(): void {
    this.configurarSubheader();

    // Cargar proyectos una sola vez
    this.cargarProyectosUnaVez();

    // Reaccionar a cambios en el filtro de proyecto y búsqueda
    combineLatest([
      toObservable(this.layoutSvc.filterValues, { injector: this.injector }),
      toObservable(this.layoutSvc.searchValue, { injector: this.injector })
    ]).pipe(
      debounceTime(300),
      distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.paginacion.update(p => ({ ...p, pagina: 1 }));
      this.cargarUsuariosAsignados();
    });

    // Reaccionar a cambios en los parámetros de ruta (navegación dentro del mismo componente)
    this.route.paramMap.pipe(
      takeUntil(this.destroy$)
    ).subscribe(paramMap => {
      const idParam = paramMap.get('id');
      this.preseleccionarProyectoPorId(idParam ? +idParam : null);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.layoutSvc.resetSubheader();
  }

  // ── Configuración inicial del subheader (sin opciones) ──
  private configurarSubheader(): void {
    this.layoutSvc.setSubheader({
      title: 'Usuarios del Proyecto',
      showSearch: true,
      searchPlaceholder: 'Buscar por nombre o username...',
      filters: [
        {
          type: 'select',
          key: 'proyectoId',
          placeholder: 'Seleccionar proyecto...',
          options: []
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

  // Carga única de proyectos y actualización de opciones del filtro
  private cargarProyectosUnaVez(): void {
    if (this.proyectosCargados) return;
    this.saSvc.getProyectos()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (proyectos) => {
          this.proyectos.set(proyectos);
          this.actualizarOpcionesFiltroProyecto();
          this.proyectosCargados = true;
          // Luego de cargar los proyectos, preseleccionar según la ruta actual
          const idParam = this.route.snapshot.paramMap.get('id');
          this.preseleccionarProyectoPorId(idParam ? +idParam : null);
        },
        error: () => this.alert.error('No se pudieron cargar los proyectos')
      });
  }

  private actualizarOpcionesFiltroProyecto(): void {
    const proyectos = this.proyectos();
    const options = proyectos.map(p => ({
      label: `${p.nombre} (${p.codigo})`,
      value: p.id.toString()
    }));
    const currentFilters = this.layoutSvc.subheaderFilters();
    const proyectoFilterIndex = currentFilters.findIndex(f => f.key === 'proyectoId');
    if (proyectoFilterIndex !== -1) {
      const updatedFilter = { ...currentFilters[proyectoFilterIndex], options };
      const newFilters = [...currentFilters];
      newFilters[proyectoFilterIndex] = updatedFilter;
      this.layoutSvc.subheaderFilters.set(newFilters);
    } else {
      this.layoutSvc.subheaderFilters.update(filters => [
        ...filters,
        {
          type: 'select',
          key: 'proyectoId',
          placeholder: 'Seleccionar proyecto...',
          options
        }
      ]);
    }
  }

  // Preselecciona el proyecto según ID (null = limpiar filtro)
  private preseleccionarProyectoPorId(id: number | null): void {
    if (!this.proyectosCargados) return; // esperar a que los proyectos estén listos
    if (id && this.proyectos().some(p => p.id === id)) {
      this.layoutSvc.filterValues.update(f => ({ ...f, proyectoId: id.toString() }));
    } else {
      // Si no hay id válido, limpiar el filtro de proyecto (pero mantener otros filtros)
      this.layoutSvc.filterValues.update(f => {
        const { proyectoId, ...rest } = f;
        return rest;
      });
    }
  }

  // ── Carga de datos ──
  cargarUsuariosAsignados(): void {
    const proyectoId = this.layoutSvc.filterValues()['proyectoId'];
    if (!proyectoId) {
      this.usuariosAsignados.set([]);
      this.paginacion.update(p => ({ ...p, totalRegistros: 0 }));
      this.proyectoSeleccionado.set(null);
      return;
    }
    const id = +proyectoId;
    const proyecto = this.proyectos().find(p => p.id === id) || null;
    this.proyectoSeleccionado.set(proyecto);

    this.cargando.set(true);
    const { pagina, tamanoPagina } = this.paginacion();
    const busqueda = this.layoutSvc.searchValue().trim();

    this.saSvc.getUsuariosPorProyecto(id, pagina, tamanoPagina, busqueda)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result: PagedResult<UsuarioProyectoDto>) => {
          this.usuariosAsignados.set(result.items);
          this.paginacion.set({
            pagina: result.pagina,
            tamanoPagina: result.tamanoPagina,
            totalRegistros: result.totalRegistros
          });
          this.cargando.set(false);
          this.cargarRolesProyecto(id);
        },
        error: () => {
          this.cargando.set(false);
          this.alert.error('Error al cargar los usuarios del proyecto');
        }
      });
  }

  cargarRolesProyecto(proyectoId: number): void {
    this.saSvc.getRolesProyecto(proyectoId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (roles) => this.rolesProyecto.set(roles),
        error: () => this.alert.error('No se pudieron cargar los roles')
      });
  }

  limpiarFiltros(): void {
    this.layoutSvc.searchValue.set('');
    this.layoutSvc.filterValues.update(() => ({})); // limpia todos los filtros
    this.paginacion.update(p => ({ ...p, pagina: 1 }));
    this.cargarUsuariosAsignados();
  }

  // ── Modal Asignar usuario ── (sin cambios)
  async abrirModalAsignar(): Promise<void> {
    if (!this.puedeAdministrar()) return;
    const proyectoId = this.layoutSvc.filterValues()['proyectoId'];
    if (!proyectoId) {
      this.alert.error('Debe seleccionar un proyecto primero');
      return;
    }
    this.cargarUsuariosDisponibles(+proyectoId);
    this.asignarForm.reset({ usuarioId: null, rolId: null });
    this.modalAsignarAbierto.set(true);
  }

  cargarUsuariosDisponibles(proyectoId: number): void {
    this.saSvc.getUsuarios(1, 100, false, true)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (usuarios) => {
          const idsAsignados = this.usuariosAsignados().map(u => u.usuarioId);
          const disponibles = usuarios.items.filter(u => !idsAsignados.includes(u.id));
          this.usuariosDisponibles.set(disponibles);
        },
        error: () => this.alert.error('No se pudieron cargar los usuarios')
      });
  }

  async guardarAsignacion(): Promise<void> {
    if (this.asignarForm.invalid) return;
    const proyectoId = this.layoutSvc.filterValues()['proyectoId'];
    if (!proyectoId) return;
    const { usuarioId, rolId } = this.asignarForm.value;
    const usuario = this.usuariosDisponibles().find(u => u.id === usuarioId);
    const rol = this.rolesProyecto().find(r => r.id === rolId);
    const confirmado = await this.alert.confirmarAgregar(`${usuario?.nombreCompleto} → ${rol?.nombre}`);
    if (!confirmado) return;
    const request: AsignarProyectoRolRequest = { proyectoId: +proyectoId, rolId };
    this.saSvc.asignarProyectoRol(usuarioId, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.cargarUsuariosAsignados();
          this.modalAsignarAbierto.set(false);
          this.alert.exito('Usuario asignado correctamente');
        },
        error: () => this.alert.error('Error al asignar el usuario')
      });
  }

  cerrarModalAsignar(): void {
    this.modalAsignarAbierto.set(false);
  }

  // ── Modal Cambiar rol ── (sin cambios)
  abrirModalCambiarRol(usuario: UsuarioProyectoDto): void {
    if (!this.puedeAdministrar()) return;
    this.usuarioSeleccionado.set(usuario);
    const roles = this.rolesProyecto().filter(r => r.nombre !== usuario.rol);
    this.rolesDisponibles.set(roles);
    this.nuevoRolId.set(null);
    this.modalCambiarRolAbierto.set(true);
  }

  async guardarCambioRol(): Promise<void> {
    const nuevoRolId = this.nuevoRolId();
    if (!nuevoRolId) return;
    const usuario = this.usuarioSeleccionado();
    if (!usuario) return;
    const proyectoId = this.layoutSvc.filterValues()['proyectoId'];
    if (!proyectoId) return;
    const nuevoRol = this.rolesDisponibles().find(r => r.id === nuevoRolId);
    const confirmado = await this.alert.confirmar({
      titulo: 'Cambiar rol',
      texto: `¿Desea cambiar el rol de ${usuario.nombreCompleto} de "${usuario.rol}" a "${nuevoRol?.nombre}"?`,
      labelConfirmar: 'Sí, cambiar',
      labelCancelar: 'Cancelar'
    });
    if (!confirmado) return;
    const request: AsignarProyectoRolRequest = { proyectoId: +proyectoId, rolId: nuevoRolId };
    this.saSvc.asignarProyectoRol(usuario.usuarioId, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.cargarUsuariosAsignados();
          this.modalCambiarRolAbierto.set(false);
          this.alert.exito('Rol actualizado correctamente');
        },
        error: () => this.alert.error('Error al cambiar el rol')
      });
  }

  cerrarModalCambiarRol(): void {
    this.modalCambiarRolAbierto.set(false);
    this.usuarioSeleccionado.set(null);
    this.nuevoRolId.set(null);
  }

  // ── Revocar acceso ──
  async revocarAcceso(usuario: UsuarioProyectoDto): Promise<void> {
    if (!this.puedeAdministrar()) return;
    const proyectoId = this.layoutSvc.filterValues()['proyectoId'];
    if (!proyectoId) return;
    const confirmado = await this.alert.confirmar({
      titulo: 'Revocar acceso',
      texto: `¿Está seguro de revocar el acceso de ${usuario.nombreCompleto} al proyecto?`,
      labelConfirmar: 'Sí, revocar',
      labelCancelar: 'Cancelar'
    });
    if (!confirmado) return;
    this.saSvc.revocarProyecto(usuario.usuarioId, +proyectoId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.cargarUsuariosAsignados();
          this.alert.exito('Acceso revocado correctamente');
        },
        error: () => this.alert.error('Error al revocar el acceso')
      });
  }

  // Paginación
  cambiarPagina(pagina: number): void {
    this.paginacion.update(p => ({ ...p, pagina }));
    this.cargarUsuariosAsignados();
  }

  totalPaginas(): number {
    return Math.ceil(this.paginacion().totalRegistros / this.paginacion().tamanoPagina);
  }

  badgeActivo(activo: boolean): 'green' | 'red' {
    return activo ? 'green' : 'red';
  }

  formatFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString();
  }
}