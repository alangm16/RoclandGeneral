import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MatTabsModule } from '@angular/material/tabs';
import { MatMenuModule } from '@angular/material/menu';
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
  ActualizarVistaRequest,
  ActualizarProyectoRequest,
} from '../../../../models/superadmin.models';

// ── Nodo del árbol ──────────────────────────────────────────────────
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
  nivel: number;           // 0-based: 0=raíz, 1=hijo, 2=nieto (máx)
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
    MatMenuModule,
    ModalComponent,
    BadgeComponent,
    DataTableComponent,
  ],
  templateUrl: './conf-proyectos.component.html',
  styleUrls: ['./conf-proyectos.component.scss'],
})
export class ConfiguracionProyectoComponent implements OnInit, OnDestroy {
  private route     = inject(ActivatedRoute);
  private router    = inject(Router);
  private layoutSvc = inject(LayoutService);
  private saSvc     = inject(SuperadminService);
  private fb        = inject(FormBuilder);
  private alert     = inject(AlertService);
  private authSvc   = inject(AuthService);
  private destroy$  = new Subject<void>();

  // ── Estado general ───────────────────────────────────────────────
  proyectoId = signal<number | null>(null);
  proyecto   = signal<ProyectoDetalleDto | null>(null);
  cargando   = signal(false);

  puedeAdministrar = computed(() => {
    const rol = this.authSvc.proyectoActivo()?.rolEnProyecto;
    return rol === 'SuperAdmin' || rol === 'Admin';
  });

  // ── Información General ──────────────────────────────────────────
  proyectoForm: FormGroup;

  // ── Roles ────────────────────────────────────────────────────────
  roles           = signal<RolDto[]>([]);
  modalRolAbierto = signal(false);
  editandoRolId   = signal<number | null>(null);
  rolForm: FormGroup;

  columnasRoles: DataTableColumn[] = [
    { key: 'nombre',      label: 'NOMBRE' },
    { key: 'nivel',       label: 'NIVEL',       cellClass: 'text-center' },
    { key: 'descripcion', label: 'DESCRIPCIÓN' },
    { key: 'activo',      label: 'ESTADO',      cellClass: 'text-center' },
    { key: 'acciones',    label: '',             cellClass: 'text-end' },
  ];

  // ── Vistas (árbol) ───────────────────────────────────────────────
  vistas          = signal<VistaDto[]>([]);
  /** Árbol derivado de `vistas`. Se recalcula al cambiar la lista plana. */
  vistaTree       = signal<VistaTreeNode[]>([]);
  /** Set de IDs expandidos. Empezamos con todos expandidos. */
  expandedNodes   = new Set<number>();

  modalVistaAbierto  = signal(false);
  editandoVistaId    = signal<number | null>(null);
  /** Nodo padre seleccionado al crear una sub-vista (para mostrar contexto en el modal). */
  modalContextoPadre = signal<VistaTreeNode | null>(null);
  vistaForm: FormGroup;

  mostrarInactivas = signal(false);
  
  /** Nivel resultante de la vista que se va a crear (1-based para UI). */
  modalNivelResultante = computed(() => {
    const padre = this.modalContextoPadre();
    if (!padre) return 1;          // raíz → nivel 1
    return padre.nivel + 2;        // nivel 0-based → 1-based + 1 por el hijo
  });

  constructor() {
    this.proyectoForm = this.fb.group({
      codigo:      [{ value: '', disabled: true }, Validators.required],
      nombre:      ['', Validators.required],
      plataforma:  ['Web', Validators.required],
      iconoCss:    ['bi-box'],
      urlBase:     [''],
      version:     ['1.0.0'],
      estado:      ['Produccion', Validators.required],
      descripcion: [''],
      orden:       [0, [Validators.required, Validators.min(0)]],
    });

    this.rolForm = this.fb.group({
      nombre:      ['', Validators.required],
      nivel:       [1, [Validators.required, Validators.min(1)]],
      descripcion: [''],
      activo:      [true],
    });

    this.vistaForm = this.fb.group({
      codigo:       ['', Validators.required],
      nombre:       ['', Validators.required],
      ruta:         ['', Validators.required],
      icono:        ['bi-file-earmark'],
      descripcion:  [''],
      orden:        [1, [Validators.required, Validators.min(1)]],
      vistaPadreId: [null],
      esContenedor: [false],
      activo:       [true],
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
    this.layoutSvc.setSubheader({ title: 'Configuración del Proyecto' });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.layoutSvc.resetSubheader();
  }

  // ── INFORMACIÓN GENERAL ──────────────────────────────────────────

  cargarProyecto(): void {
    this.cargando.set(true);
    this.saSvc.getProyectoDetalle(this.proyectoId()!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (proy) => {
          this.proyecto.set(proy);
          this.proyectoForm.patchValue({
            codigo:      proy.codigo,
            nombre:      proy.nombre,
            plataforma:  proy.plataforma,
            iconoCss:    proy.iconoCss,
            urlBase:     proy.urlBase,
            version:     proy.version,
            estado:      proy.estado,
            descripcion: proy.descripcion,
            orden:       proy.orden,
          });
          this.cargando.set(false);
        },
        error: () => this.cargando.set(false),
      });
  }

  async guardarInformacionGeneral(): Promise<void> {
    if (!this.puedeAdministrar() || this.proyectoForm.invalid) return;
    const nombre = this.proyectoForm.value.nombre;
    if (!(await this.alert.confirmarEditar(nombre))) return;

    const dto: ActualizarProyectoRequest = this.proyectoForm.getRawValue();
    this.saSvc.actualizarProyecto(this.proyectoId()!, dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.alert.exito('Proyecto actualizado correctamente.'); this.cargarProyecto(); },
        error: () => this.alert.error('No se pudo actualizar el proyecto.'),
      });
  }

  // ── ROLES ────────────────────────────────────────────────────────

  cargarRoles(): void {
    this.saSvc.getRolesProyecto(this.proyectoId()!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next:  (roles) => this.roles.set(roles),
        error: () => this.alert.error('No se pudieron cargar los roles'),
      });
  }

  abrirModalRol(rol?: RolDto): void {
    if (!this.puedeAdministrar()) return;
    this.rolForm.reset({ nombre: '', nivel: 1, descripcion: '', activo: true });
    if (rol) {
      this.editandoRolId.set(rol.id);
      this.rolForm.patchValue({ nombre: rol.nombre, nivel: rol.nivel, descripcion: rol.descripcion, activo: rol.activo });
    } else {
      this.editandoRolId.set(null);
    }
    this.modalRolAbierto.set(true);
  }

  cerrarModalRol(): void { this.modalRolAbierto.set(false); }

  async guardarRol(): Promise<void> {
    if (this.rolForm.invalid) return;
    const esEdicion   = this.editandoRolId() !== null;
    const nombre      = this.rolForm.value.nombre;
    const confirmado  = esEdicion
      ? await this.alert.confirmarEditar(nombre)
      : await this.alert.confirmarAgregar(nombre);
    if (!confirmado) return;

    const proyectoId = this.proyectoId()!;
    if (esEdicion) {
      const dto: ActualizarRolRequest = this.rolForm.value;
      this.saSvc.actualizarRolProyecto(proyectoId, this.editandoRolId()!, dto)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => { this.cargarRoles(); this.cerrarModalRol(); this.alert.exito(`Rol "${nombre}" actualizado.`); },
          error: () => this.alert.error('No se pudo actualizar el rol.'),
        });
    } else {
      const dto: CrearRolRequest = this.rolForm.value;
      this.saSvc.crearRolProyecto(proyectoId, dto)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => { this.cargarRoles(); this.cerrarModalRol(); this.alert.exito(`Rol "${nombre}" creado.`); },
          error: () => this.alert.error('No se pudo crear el rol.'),
        });
    }
  }

  async toggleActivoRol(rol: RolDto): Promise<void> {
    if (!this.puedeAdministrar()) return;
    const accion      = rol.activo ? 'desactivar' : 'activar';
    const confirmado  = await this.alert.confirmar({
      titulo:         `¿${rol.activo ? 'Desactivar' : 'Activar'} rol?`,
      texto:          `Se ${accion}á el rol "${rol.nombre}".`,
      labelConfirmar: `Sí, ${accion}`,
      labelCancelar:  'Cancelar',
    });
    if (!confirmado) return;

    const proyectoId = this.proyectoId()!;
    const obs$ = rol.activo
      ? this.saSvc.eliminarRolProyecto(proyectoId, rol.id)
      : this.saSvc.activarRolProyecto(proyectoId, rol.id);
    obs$.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.cargarRoles(); this.alert.exito(`Rol "${rol.nombre}" ${rol.activo ? 'desactivado' : 'activado'}.`); },
      error: (err) => {
        const msg = err.error?.mensaje ?? `No se pudo ${accion} el rol.`;
        this.alert.error(msg);
      },
    });
  }

  badgeActivo(activo: boolean): 'green' | 'red' { return activo ? 'green' : 'red'; }

  // ── VISTAS (ÁRBOL JERÁRQUICO) ────────────────────────────────────

  cargarVistas(): void {
      this.cargando.set(true);
      const incluirInactivas = this.mostrarInactivas(); // ← leer el signal
      this.saSvc.getVistasProyecto(this.proyectoId()!, incluirInactivas)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (vistas) => {
            this.vistas.set(vistas);
            const tree = this.buildVistaTree(vistas);
            this.expandAll(tree);
            this.vistaTree.set(tree);
            this.cargando.set(false);
          },
          error: () => {
            this.cargando.set(false);
            this.alert.error('No se pudieron cargar las vistas');
          }
        });
  }

  toggleMostrarInactivas(): void {
      this.mostrarInactivas.update(v => !v);
      this.cargarVistas();
  }

  private buildVistaTree(vistas: VistaDto[]): VistaTreeNode[] {
    const map   = new Map<number, VistaTreeNode>();
    const roots: VistaTreeNode[] = [];

    // Calcular nivel de cada nodo
    const calcNivel = (v: VistaDto): number => {
      if (!v.vistaPadreId) return 0;
      const padre = vistas.find(p => p.id === v.vistaPadreId);
      return padre ? calcNivel(padre) + 1 : 0;
    };

    // Crear nodos
    vistas.forEach(v => {
      map.set(v.id, { ...v, nivel: calcNivel(v), hijos: [] });
    });

    // Asignar hijos
    vistas.forEach(v => {
      const node = map.get(v.id)!;
      if (v.vistaPadreId && map.has(v.vistaPadreId)) {
        map.get(v.vistaPadreId)!.hijos.push(node);
      } else {
        roots.push(node);
      }
    });

    // Ordenar recursivamente
    const sort = (nodes: VistaTreeNode[]) => {
      nodes.sort((a, b) => a.orden - b.orden);
      nodes.forEach(n => sort(n.hijos));
    };
    sort(roots);
    return roots;
  }

  private expandAll(nodes: VistaTreeNode[]): void {
    nodes.forEach(n => {
      if (n.hijos.length > 0) {
        this.expandedNodes.add(n.id);
        this.expandAll(n.hijos);
      }
    });
  }

  toggleNodo(id: number): void {
    if (this.expandedNodes.has(id)) {
      this.expandedNodes.delete(id);
    } else {
      this.expandedNodes.add(id);
    }
    // Trigger change detection para el Set (es mutable, no dispara signals)
    this.vistaTree.update(t => [...t]);
  }

  /** Array auxiliar para generar la indentación visual del árbol. */
  getIndentArray(nivel: number): number[] {
    return Array.from({ length: nivel }, (_, i) => i);
  }

  // ── MODAL DE VISTA ───────────────────────────────────────────────

  /**
   * Abre el modal de crear/editar vista.
   * @param vista  Si se pasa, es edición.
   * @param padre  Nodo padre en el que se insertará la nueva vista.
   */
  abrirModalVista(vista?: VistaTreeNode, padre?: VistaTreeNode): void {
    if (!this.puedeAdministrar()) return;

    this.vistaForm.reset({
      codigo:       '',
      nombre:       '',
      ruta:         '',
      icono:        'bi-file-earmark',
      descripcion:  '',
      orden:        1,
      vistaPadreId: padre?.id ?? null,
      esContenedor: false,
      activo:       true,
    });

    this.modalContextoPadre.set(padre ?? null);

    if (vista) {
      // Modo edición: encontrar el padre del nodo que se edita
      const padreDelNodo = vista.vistaPadreId
        ? this.findNodeById(this.vistaTree(), vista.vistaPadreId) ?? null
        : null;
      this.modalContextoPadre.set(padreDelNodo);

      this.editandoVistaId.set(vista.id);
      this.vistaForm.patchValue({
        codigo:       vista.codigo,
        nombre:       vista.nombre,
        ruta:         vista.ruta,
        icono:        vista.icono,
        descripcion:  vista.descripcion,
        orden:        vista.orden,
        vistaPadreId: vista.vistaPadreId,
        esContenedor: vista.esContenedor,
        activo:       vista.activo,
      });
      // Si es contenedor, la ruta no es obligatoria
      this.onEsContenedorChange(vista.esContenedor);
    } else {
      this.editandoVistaId.set(null);
    }

    this.modalVistaAbierto.set(true);
  }

  cerrarModalVista(): void { this.modalVistaAbierto.set(false); }

  onEsContenedorChange(esContenedor: boolean): void {
    const rutaCtrl = this.vistaForm.get('ruta')!;
    if (esContenedor) {
      rutaCtrl.clearValidators();
      rutaCtrl.setValue('');
    } else {
      rutaCtrl.setValidators(Validators.required);
    }
    rutaCtrl.updateValueAndValidity();
    // Actualizar el formControl esContenedor para que el template refleje el cambio
    this.vistaForm.get('esContenedor')!.setValue(esContenedor, { emitEvent: false });
  }

  async guardarVista(): Promise<void> {
    if (this.vistaForm.invalid) return;
    const esEdicion  = this.editandoVistaId() !== null;
    const nombre     = this.vistaForm.value.nombre;
    const confirmado = esEdicion
      ? await this.alert.confirmarEditar(nombre)
      : await this.alert.confirmarAgregar(nombre);
    if (!confirmado) return;

    const proyectoId = this.proyectoId()!;
    const raw        = this.vistaForm.getRawValue();
    if (raw.esContenedor) raw.ruta = '';

    if (esEdicion) {
      const dto: ActualizarVistaRequest = raw;
      this.saSvc.actualizarVistaProyecto(proyectoId, this.editandoVistaId()!, dto)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => { this.cargarVistas(); this.cerrarModalVista(); this.alert.exito(`Vista "${nombre}" actualizada.`); },
          error: () => this.alert.error('No se pudo actualizar la vista'),
        });
    } else {
      const dto: CrearVistaRequest = raw;
      this.saSvc.crearVistaProyecto(proyectoId, dto)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => { this.cargarVistas(); this.cerrarModalVista(); this.alert.exito(`Vista "${nombre}" creada.`); },
          error: () => this.alert.error('No se pudo crear la vista'),
        });
    }
  }

  async eliminarVista(vistaId: number): Promise<void> {
    const vista = this.vistas().find(v => v.id === vistaId);
    if (!vista) return;
    const confirmado = await this.alert.confirmar({
      titulo:         '¿Eliminar vista?',
      texto:          `La vista "${vista.nombre}" quedará inactiva.`,
      labelConfirmar: 'Sí, eliminar',
      labelCancelar:  'Cancelar',
    });
    if (!confirmado) return;

    this.saSvc.eliminarVistaProyecto(this.proyectoId()!, vistaId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next:  () => { this.cargarVistas(); this.alert.exito('Vista eliminada correctamente.'); },
        error: () => this.alert.error('No se pudo eliminar la vista.'),
      });
  }

  async toggleActivoVista(vista: VistaTreeNode): Promise<void> {
    if (!this.puedeAdministrar()) return;
    const accion     = vista.activo ? 'desactivar' : 'activar';
    const confirmado = await this.alert.confirmar({
      titulo:         `¿${vista.activo ? 'Desactivar' : 'Activar'} vista?`,
      texto:          `Se ${accion}á la vista "${vista.nombre}".`,
      labelConfirmar: `Sí, ${accion}`,
      labelCancelar:  'Cancelar',
    });
    if (!confirmado) return;

    const proyectoId = this.proyectoId()!;
    const obs$ = vista.activo
      ? this.saSvc.eliminarVistaProyecto(proyectoId, vista.id)
      : this.saSvc.activarVistaProyecto(proyectoId, vista.id);
    obs$.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.cargarVistas(); this.alert.exito(`Vista "${vista.nombre}" ${vista.activo ? 'desactivada' : 'activada'}.`); },
      error: (err) => {
        const msg = err.error?.mensaje ?? `No se pudo ${accion} la vista.`;
        this.alert.error(msg);
      },
    });
  }

  // ── HELPERS ──────────────────────────────────────────────────────

  private findNodeById(nodes: VistaTreeNode[], id: number): VistaTreeNode | undefined {
    for (const node of nodes) {
      if (node.id === id) return node;
      const found = this.findNodeById(node.hijos, id);
      if (found) return found;
    }
    return undefined;
  }
}