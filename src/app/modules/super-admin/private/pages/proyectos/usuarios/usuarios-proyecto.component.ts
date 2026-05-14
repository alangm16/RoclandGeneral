import { Component, OnInit, OnDestroy, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
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
  private destroy$ = new Subject<void>();

  // Permisos
  puedeAdministrar = computed(() => {
    const rol = this.authSvc.proyectoActivo()?.rolEnProyecto;
    return rol === 'SuperAdmin' || rol === 'Admin';
  });

  // Proyectos disponibles
  proyectos = signal<ProyectoListDto[]>([]);
  proyectoSeleccionado = signal<ProyectoListDto | null>(null);

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
    this.cargarProyectos();
    this.configurarSubheader();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.layoutSvc.resetSubheader();
  }

  // ── Configuración del subheader (con selector de proyectos) ──
  configurarSubheader(): void {
    this.layoutSvc.setSubheader({
      title: 'Usuarios del Proyecto',
    //   showBackButton: true,
    //   backRoute: '/private/super-admin/proyectos/listado',
    //   customContent: this.renderProjectSelector()
    });
  }

  totalPaginas(): number {
    return Math.ceil(this.paginacion().totalRegistros / this.paginacion().tamanoPagina);
    }

  // Renderiza un selector de proyectos dentro del subheader
  private renderProjectSelector(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'project-selector-wrapper';
    container.innerHTML = `
      <select id="proyectoSelect" class="form-select form-select-sm" style="width: 200px;">
        <option value="">Seleccionar proyecto...</option>
        ${this.proyectos().map(p => `<option value="${p.id}">${p.nombre} (${p.codigo})</option>`).join('')}
      </select>
    `;
    const select = container.querySelector('#proyectoSelect') as HTMLSelectElement;
    if (select) {
      select.addEventListener('change', (e) => {
        const id = parseInt((e.target as HTMLSelectElement).value, 10);
        const proyecto = this.proyectos().find(p => p.id === id) || null;
        this.proyectoSeleccionado.set(proyecto);
        if (proyecto) {
          this.cargarUsuariosAsignados();
          this.cargarRolesProyecto();
        } else {
          this.usuariosAsignados.set([]);
        }
      });
    }
    return container;
  }

  // ── Carga de datos ──
  cargarProyectos(): void {
    this.saSvc.getProyectos()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (proyectos) => {
          this.proyectos.set(proyectos);
          this.configurarSubheader(); // refrescar selector con nuevos proyectos
        },
        error: () => this.alert.error('No se pudieron cargar los proyectos')
      });
  }

  cargarUsuariosAsignados(): void {
    const proyecto = this.proyectoSeleccionado();
    if (!proyecto) return;

    this.cargando.set(true);
    const { pagina, tamanoPagina } = this.paginacion();
    this.saSvc.getUsuariosPorProyecto(proyecto.id, pagina, tamanoPagina)
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
        },
        error: () => {
          this.cargando.set(false);
          this.alert.error('Error al cargar los usuarios del proyecto');
        }
      });
  }

  cargarRolesProyecto(): void {
    const proyecto = this.proyectoSeleccionado();
    if (!proyecto) return;
    this.saSvc.getRolesProyecto(proyecto.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (roles) => this.rolesProyecto.set(roles),
        error: () => this.alert.error('No se pudieron cargar los roles')
      });
  }

  // ── Modal: Asignar usuario ──
  async abrirModalAsignar(): Promise<void> {
    if (!this.puedeAdministrar()) return;
    const proyecto = this.proyectoSeleccionado();
    if (!proyecto) {
      this.alert.error('Debe seleccionar un proyecto primero');
      return;
    }

    // Cargar usuarios no asignados al proyecto
    this.cargarUsuariosDisponibles(proyecto.id);
    this.asignarForm.reset({ usuarioId: null, rolId: null });
    this.modalAsignarAbierto.set(true);
  }

  cargarUsuariosDisponibles(proyectoId: number): void {
    // Obtener todos los usuarios activos y filtrar los ya asignados
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
    const proyecto = this.proyectoSeleccionado();
    if (!proyecto) return;

    const { usuarioId, rolId } = this.asignarForm.value;
    const usuario = this.usuariosDisponibles().find(u => u.id === usuarioId);
    const rol = this.rolesProyecto().find(r => r.id === rolId);
    const confirmado = await this.alert.confirmarAgregar(`${usuario?.nombreCompleto} → ${rol?.nombre}`);
    if (!confirmado) return;

    const request: AsignarProyectoRolRequest = {
      proyectoId: proyecto.id,
      rolId: rolId
    };
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

  // ── Modal: Cambiar rol ──
  abrirModalCambiarRol(usuario: UsuarioProyectoDto): void {
    if (!this.puedeAdministrar()) return;
    this.usuarioSeleccionado.set(usuario);
    // Cargar roles (excluyendo el actual)
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
    const proyecto = this.proyectoSeleccionado();
    if (!proyecto) return;

    const nuevoRol = this.rolesDisponibles().find(r => r.id === nuevoRolId);
    const confirmado = await this.alert.confirmar({
      titulo: 'Cambiar rol',
      texto: `¿Desea cambiar el rol de ${usuario.nombreCompleto} de "${usuario.rol}" a "${nuevoRol?.nombre}"?`,
      labelConfirmar: 'Sí, cambiar',
      labelCancelar: 'Cancelar'
    });
    if (!confirmado) return;

    const request: AsignarProyectoRolRequest = {
      proyectoId: proyecto.id,
      rolId: nuevoRolId
    };
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
    const proyecto = this.proyectoSeleccionado();
    if (!proyecto) return;

    const confirmado = await this.alert.confirmar({
      titulo: 'Revocar acceso',
      texto: `¿Está seguro de revocar el acceso de ${usuario.nombreCompleto} al proyecto?`,
      labelConfirmar: 'Sí, revocar',
      labelCancelar: 'Cancelar'
    });
    if (!confirmado) return;

    this.saSvc.revocarProyecto(usuario.usuarioId, proyecto.id)
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

  // Helpers
  badgeActivo(activo: boolean): 'green' | 'red' {
    return activo ? 'green' : 'red';
  }

  formatFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString();
  }
}