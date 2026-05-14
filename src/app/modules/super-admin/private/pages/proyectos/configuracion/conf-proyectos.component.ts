import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MatTabsModule } from '@angular/material/tabs';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { NestedTreeControl } from '@angular/cdk/tree';
import { MatTreeModule, MatTreeNestedDataSource } from '@angular/material/tree';
import { MatIconModule } from '@angular/material/icon';

import { LayoutService } from '../../../../../../core/services/layout.service';
import { SuperadminService } from '../../../../services/super-admin.service';
import { AuthService } from '../../../../../../core/auth/auth.service';
import { AlertService } from '../../../../../../shared/components/swal-alert/alert.service';
import { ModalComponent } from '../../../../../../shared/components/modal/modal.component';
import { BadgeComponent } from '../../../../../../shared/components/badge/badge-component';
import { DataTableComponent, DataTableColumn } from '../../../../../../shared/components/data-table/data-table.component';

import {
  ProyectoDetalleDto,
  RolDto,
  VistaDto,
  CrearRolRequest,
  ActualizarRolRequest,
  CrearVistaRequest,
  ActualizarProyectoRequest,
} from '../../../../models/superadmin.models';

// Interfaz para nodo del árbol
export interface VistaTreeNode {
  id: number;
  codigo: string;
  nombre: string;
  ruta: string;
  icono: string | null;
  descripcion: string | null;
  orden: number;
  activo: boolean;
  esContenedor: boolean;
  vistaPadreId: number | null;
  nivel: number;           // 0 = raíz, 1 = hijo, 2 = nieto (máximo 3 niveles)
  hijos: VistaTreeNode[];
}

@Component({
  selector: 'app-configuracion-proyecto',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatTabsModule,
    MatButtonModule,
    MatMenuModule,
    MatTreeModule,
    MatIconModule,
    ModalComponent,
    BadgeComponent,
    DataTableComponent,
  ],
  templateUrl: './conf-proyectos.component.html',
  styleUrls: ['./conf-proyectos.component.scss'],
})
export class ConfiguracionProyectoComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private layoutSvc = inject(LayoutService);
  private saSvc = inject(SuperadminService);
  private fb = inject(FormBuilder);
  private alert = inject(AlertService);
  private authSvc = inject(AuthService);
  private destroy$ = new Subject<void>();

  // ===============================
  // Estado general
  proyectoId = signal<number | null>(null);
  proyecto = signal<ProyectoDetalleDto | null>(null);
  cargando = signal(false);

  puedeAdministrar = computed(() => {
    const rol = this.authSvc.proyectoActivo()?.rolEnProyecto;
    return rol === 'SuperAdmin' || rol === 'Admin';
  });

  // ===============================
  // Información General
  proyectoForm: FormGroup;

  // ===============================
  // Roles
  roles = signal<RolDto[]>([]);
  modalRolAbierto = signal(false);
  editandoRolId = signal<number | null>(null);
  rolForm: FormGroup;

  columnasRoles: DataTableColumn[] = [
    { key: 'nombre', label: 'NOMBRE' },
    { key: 'nivel', label: 'NIVEL', cellClass: 'text-center' },
    { key: 'descripcion', label: 'DESCRIPCIÓN' },
    { key: 'activo', label: 'ESTADO', cellClass: 'text-center' },
    { key: 'acciones', label: '', cellClass: 'text-end' },
  ];

  // ===============================
  // Vistas (árbol jerárquico)
  vistas = signal<VistaDto[]>([]);
  treeControl = new NestedTreeControl<VistaTreeNode>((node: VistaTreeNode) => node.hijos);
  dataSource = new MatTreeNestedDataSource<VistaTreeNode>();
  hasChild = (_: number, node: VistaTreeNode) => node.hijos.length > 0;

  modalVistaAbierto = signal(false);
  editandoVistaId = signal<number | null>(null);
  vistaForm: FormGroup;

  constructor() {
    // Formulario de proyecto
    this.proyectoForm = this.fb.group({
      codigo:      [{ value: '', disabled: true }, Validators.required],
      nombre:      ['', Validators.required],
      plataforma:  ['Web', Validators.required],
      iconoCss:    ['bi-box'],
      urlBase:     [''],
      version:     ['1.0.0', Validators.required],
      estado:      ['Produccion', Validators.required],
      descripcion: [''],
      orden:       [0, [Validators.required, Validators.min(0)]]
    });

    // Formulario de rol
    this.rolForm = this.fb.group({
      nombre: ['', Validators.required],
      nivel: [1, [Validators.required, Validators.min(1)]],
      descripcion: [''],
      activo: [true],
    });

    // Formulario de vista
    this.vistaForm = this.fb.group({
      codigo: ['', Validators.required],
      nombre: ['', Validators.required],
      ruta: ['', Validators.required],
      icono: ['bi-file-earmark'],
      descripcion: [''],
      orden: [1, [Validators.required, Validators.min(1)]],
      vistaPadreId: [null],
      esContenedor: [false],
      activo: [true],
    });
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      this.alert.error('ID de proyecto no proporcionado');
      this.router.navigate(['/private/super-admin/proyectos/listado']);
      return;
    }
    const id = +idParam;
    this.proyectoId.set(id);
    this.cargarProyecto();
    this.cargarRoles();
    this.cargarVistas();
    this.layoutSvc.setSubheader({
      title: 'Configuración del Proyecto',
      // backRoute: '/private/super-admin/proyectos/listado',
      // showBackButton: true,
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.layoutSvc.resetSubheader();
  }

  // ===============================
  // INFORMACIÓN GENERAL
  cargarProyecto(): void {
    this.cargando.set(true);
    this.saSvc
      .getProyectoDetalle(this.proyectoId()!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (proy) => {
          this.proyecto.set(proy);
          this.proyectoForm.patchValue({
            codigo: proy.codigo,
            nombre: proy.nombre,
            plataforma: proy.plataforma,
            iconoCss: proy.iconoCss,
            urlBase: proy.urlBase,
            version: proy.version,
            estado: proy.estado,
            descripcion: proy.descripcion,
            orden: proy.orden,
          });
          this.cargando.set(false);
        },
        error: () => this.cargando.set(false),
      });
  }

  async guardarInformacionGeneral(): Promise<void> {
    if (!this.puedeAdministrar() || this.proyectoForm.invalid) return;
    const nombre = this.proyectoForm.value.nombre;
    const confirmado = await this.alert.confirmarEditar(nombre);
    if (!confirmado) return;

    const dto: ActualizarProyectoRequest = this.proyectoForm.getRawValue();
    this.saSvc
      .actualizarProyecto(this.proyectoId()!, dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.alert.exito('Proyecto actualizado correctamente.');
          this.cargarProyecto();
        },
        error: () => this.alert.error('No se pudo actualizar el proyecto.'),
      });
  }

  // ===============================
  // ROLES
  cargarRoles(): void {
    this.saSvc
      .getRolesProyecto(this.proyectoId()!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (roles) => this.roles.set(roles),
        error: () => this.alert.error('No se pudieron cargar los roles'),
      });
  }

  abrirModalRol(rol?: RolDto): void {
    if (!this.puedeAdministrar()) return;
    this.rolForm.reset({ nombre: '', nivel: 1, descripcion: '', activo: true });
    if (rol) {
      this.editandoRolId.set(rol.id);
      this.rolForm.patchValue({
        nombre: rol.nombre,
        nivel: rol.nivel,
        descripcion: rol.descripcion,
        activo: rol.activo,
      });
    } else {
      this.editandoRolId.set(null);
    }
    this.modalRolAbierto.set(true);
  }

  cerrarModalRol(): void {
    this.modalRolAbierto.set(false);
  }

  async guardarRol(): Promise<void> {
    if (this.rolForm.invalid) return;
    const esEdicion = this.editandoRolId() !== null;
    const nombre = this.rolForm.value.nombre;
    const confirmado = esEdicion
      ? await this.alert.confirmarEditar(nombre)
      : await this.alert.confirmarAgregar(nombre);
    if (!confirmado) return;

    const proyectoId = this.proyectoId()!;
    if (esEdicion) {
      const dto: ActualizarRolRequest = this.rolForm.value;
      this.saSvc
        .actualizarRolProyecto(proyectoId, this.editandoRolId()!, dto)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.cargarRoles();
            this.cerrarModalRol();
            this.alert.exito(`Rol "${nombre}" actualizado.`);
          },
          error: () => this.alert.error('No se pudo actualizar el rol'),
        });
    } else {
      const dto: CrearRolRequest = {
        nombre: this.rolForm.value.nombre,
        nivel: this.rolForm.value.nivel,
        descripcion: this.rolForm.value.descripcion,
      };
      this.saSvc
        .crearRolProyecto(proyectoId, dto)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.cargarRoles();
            this.cerrarModalRol();
            this.alert.exito(`Rol "${nombre}" creado.`);
          },
          error: () => this.alert.error('No se pudo crear el rol'),
        });
    }
  }

  async toggleActivoRol(rol: RolDto): Promise<void> {
    if (!this.puedeAdministrar()) return;
    const accion = rol.activo ? 'desactivar' : 'activar';
    const confirmado = await this.alert.confirmar({
      titulo: `¿${rol.activo ? 'Desactivar' : 'Activar'} rol?`,
      texto: `Se ${rol.activo ? 'desactivará' : 'activará'} el rol "${rol.nombre}".`,
      labelConfirmar: rol.activo ? 'Sí, desactivar' : 'Sí, activar',
      labelCancelar: 'Cancelar',
    });
    if (!confirmado) return;

    const proyectoId = this.proyectoId()!;
    const obs$ = rol.activo
      ? this.saSvc.eliminarRolProyecto(proyectoId, rol.id)
      : this.saSvc.activarRolProyecto(proyectoId, rol.id);
    obs$.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.cargarRoles();
        this.alert.exito(`Rol "${rol.nombre}" ${rol.activo ? 'desactivado' : 'activado'}.`);
      },
      error: (err) => {
        let msg = `No se pudo ${accion} el rol.`;
        if (err.error?.mensaje) msg = err.error.mensaje;
        this.alert.error(msg);
      },
    });
  }

  badgeActivo(activo: boolean): 'green' | 'red' {
    return activo ? 'green' : 'red';
  }

  // ===============================
  // VISTAS (ÁRBOL JERÁRQUICO)
  cargarVistas(): void {
    this.saSvc.getVistasProyecto(this.proyectoId()!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (vistas) => {
          this.vistas.set(vistas);
          const tree = this.buildVistaTree(vistas);
          this.dataSource.data = tree;
          this.treeControl.dataNodes = tree;
          this.treeControl.expandAll();
        },
        error: () => this.alert.error('No se pudieron cargar las vistas'),
      });
  }

  private buildVistaTree(vistas: VistaDto[]): VistaTreeNode[] {
    const map = new Map<number, VistaTreeNode>();
    const roots: VistaTreeNode[] = [];

    // Primero calcular niveles (profundidad)
    const nivelMap = new Map<number, number>();
    vistas.forEach(v => {
      let nivel = 0;
      let current = v;
      while (current.vistaPadreId) {
        const parent = vistas.find(p => p.id === current.vistaPadreId);
        if (!parent) break;
        nivel++;
        current = parent;
      }
      nivelMap.set(v.id, nivel);
    });

    // Crear nodos
    vistas.forEach(v => {
      const node: VistaTreeNode = {
        ...v,
        nivel: nivelMap.get(v.id) ?? 0,
        hijos: []
      };
      map.set(v.id, node);
    });

    // Asignar hijos a padres
    vistas.forEach(v => {
      const node = map.get(v.id)!;
      if (v.vistaPadreId && map.has(v.vistaPadreId)) {
        map.get(v.vistaPadreId)!.hijos.push(node);
      } else {
        roots.push(node);
      }
    });

    // Ordenar recursivamente por orden
    const sortByOrden = (nodes: VistaTreeNode[]) => {
      nodes.sort((a, b) => a.orden - b.orden);
      nodes.forEach(n => sortByOrden(n.hijos));
    };
    sortByOrden(roots);
    return roots;
  }

  // Obtener vistas candidatas para ser padres (máximo nivel 2 para permitir hasta 3 niveles)
  getParentCandidates(currentId?: number): VistaTreeNode[] {
    const allNodes: VistaTreeNode[] = [];
    const flatten = (nodes: VistaTreeNode[]) => {
      nodes.forEach(node => {
        allNodes.push(node);
        flatten(node.hijos);
      });
    };
    flatten(this.dataSource.data);
    // Excluir la misma vista (si se edita) y aquellas que ya tienen nivel >= 2 (para no exceder 3 niveles)
    return allNodes.filter(node =>
      node.id !== currentId && node.nivel < 2
    );
  }

  abrirModalVista(vista?: VistaDto, padreId?: number): void {
    if (!this.puedeAdministrar()) return;
    this.vistaForm.reset({
      codigo: '',
      nombre: '',
      ruta: '',
      icono: 'bi-file-earmark',
      descripcion: '',
      orden: 1,
      vistaPadreId: padreId ?? null,
      esContenedor: false,
      activo: true,
    });
    if (vista) {
      this.editandoVistaId.set(vista.id);
      this.vistaForm.patchValue({
        codigo: vista.codigo,
        nombre: vista.nombre,
        ruta: vista.ruta,
        icono: vista.icono,
        descripcion: vista.descripcion,
        orden: vista.orden,
        vistaPadreId: vista.vistaPadreId,
        esContenedor: vista.esContenedor,
        activo: vista.activo,
      });
    } else {
      this.editandoVistaId.set(null);
    }
    // Si es contenedor, deshabilitar ruta
    this.onEsContenedorChange({ checked: this.vistaForm.get('esContenedor')?.value });
    this.modalVistaAbierto.set(true);
  }

  cerrarModalVista(): void {
    this.modalVistaAbierto.set(false);
  }

  onEsContenedorChange(event: any): void {
    const isContainer = event.checked;
    if (isContainer) {
      this.vistaForm.get('ruta')?.disable();
      this.vistaForm.get('ruta')?.setValue('');
    } else {
      this.vistaForm.get('ruta')?.enable();
    }
  }

  async guardarVista(): Promise<void> {
    if (this.vistaForm.invalid) return;
    const esEdicion = this.editandoVistaId() !== null;
    const nombre = this.vistaForm.value.nombre;
    const confirmado = esEdicion
      ? await this.alert.confirmarEditar(nombre)
      : await this.alert.confirmarAgregar(nombre);
    if (!confirmado) return;

    const proyectoId = this.proyectoId()!;
    const dto: CrearVistaRequest = this.vistaForm.value;
    // Si es contenedor, limpiar ruta
    if (dto.esContenedor) dto.ruta = '';
    if (esEdicion) {
      this.saSvc
        .actualizarVistaProyecto(proyectoId, this.editandoVistaId()!, dto as any)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.cargarVistas();
            this.cerrarModalVista();
            this.alert.exito(`Vista "${nombre}" actualizada.`);
          },
          error: () => this.alert.error('No se pudo actualizar la vista'),
        });
    } else {
      this.saSvc
        .crearVistaProyecto(proyectoId, dto)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.cargarVistas();
            this.cerrarModalVista();
            this.alert.exito(`Vista "${nombre}" creada.`);
          },
          error: () => this.alert.error('No se pudo crear la vista'),
        });
    }
  }

  async eliminarVista(vistaId: number): Promise<void> {
    const vista = this.vistas().find(v => v.id === vistaId);
    if (!vista) return;
    const confirmado = await this.alert.confirmar({
      titulo: '¿Desactivar vista?',
      texto: `La vista "${vista.nombre}" quedará inactiva.`,
      labelConfirmar: 'Sí, desactivar',
      labelCancelar: 'Cancelar',
    });
    if (!confirmado) return;

    this.saSvc
      .eliminarVistaProyecto(this.proyectoId()!, vistaId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.cargarVistas();
          this.alert.exito('Vista desactivada correctamente.');
        },
        error: () => this.alert.error('No se pudo desactivar la vista.'),
      });
  }

  async toggleActivoVista(vista: VistaDto): Promise<void> {
    if (!this.puedeAdministrar()) return;
    const accion = vista.activo ? 'desactivar' : 'activar';
    const confirmado = await this.alert.confirmar({
      titulo: `¿${vista.activo ? 'Desactivar' : 'Activar'} vista?`,
      texto: `Se ${vista.activo ? 'desactivará' : 'activará'} la vista "${vista.nombre}".`,
      labelConfirmar: vista.activo ? 'Sí, desactivar' : 'Sí, activar',
      labelCancelar: 'Cancelar',
    });
    if (!confirmado) return;

    const proyectoId = this.proyectoId()!;
    const obs$ = vista.activo
      ? this.saSvc.eliminarVistaProyecto(proyectoId, vista.id)
      : this.saSvc.activarVistaProyecto(proyectoId, vista.id);
    obs$.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.cargarVistas();
        this.alert.exito(`Vista "${vista.nombre}" ${vista.activo ? 'desactivada' : 'activada'}.`);
      },
      error: (err) => {
        let msg = `No se pudo ${accion} la vista.`;
        if (err.error?.mensaje) msg = err.error.mensaje;
        this.alert.error(msg);
      },
    });
  }
}