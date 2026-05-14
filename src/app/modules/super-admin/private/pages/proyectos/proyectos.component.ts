import {
  Component, OnInit, OnDestroy,
  inject, signal, computed, NgZone,
  ViewChild, ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';

import { LayoutService } from '../../../../../core/services/layout.service';
import { SuperadminService } from '../../../services/super-admin.service';
import { AuthService } from '../../../../../core/auth/auth.service';
import { AlertService } from '../../../../../shared/components/swal-alert/alert.service';
import { DataTableComponent, DataTableColumn } from '../../../../../shared/components/data-table/data-table.component';
import { ModalComponent } from '../../../../../shared/components/modal/modal.component';
import { BadgeComponent } from '../../../../../shared/components/badge/badge-component';
import { RouterModule } from '@angular/router';
import {
  ProyectoListDto,
  ProyectoDetalleDto,
  CrearProyectoRequest,
  ActualizarProyectoRequest,
  CrearVistaRequest,
  ProyectoOrdenDto,
} from '../../../models/superadmin.models';

import { takeUntil } from 'rxjs/operators';

interface DragState {
  active:       boolean;
  pointerId:    number;
  fromIndex:    number;
  toIndex:      number;
  ghost:        HTMLElement | null;
  placeholder:  HTMLElement | null;
  rowHeight:    number;
  listTop:      number;
  offsetY:      number;        // offset dentro de la fila donde tocó el handle
}

@Component({
  selector: 'app-superadmin-proyectos',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatButtonModule, MatMenuModule,
    DataTableComponent, ModalComponent, BadgeComponent,
    RouterModule
  ],
  templateUrl: './proyectos.component.html',
  styleUrls: ['./proyectos.component.scss']
})
export class ProyectosComponent implements OnInit, OnDestroy {
  private readonly layoutSvc = inject(LayoutService);
  private readonly saSvc     = inject(SuperadminService);
  private readonly fb        = inject(FormBuilder);
  private readonly alert     = inject(AlertService);
  private readonly authSvc   = inject(AuthService);
  private readonly zone      = inject(NgZone);
  private readonly destroy$  = new Subject<void>();

  @ViewChild('reorderList') reorderListRef!: ElementRef<HTMLElement>;

  // ── Permiso por rol ─────────────────────────────────────────────
  readonly puedeAdministrar = computed(() => {
    const rol = this.authSvc.proyectoActivo()?.rolEnProyecto;
    return rol === 'SuperAdmin' || rol === 'Admin';
  });

  // ── Estado tabla ─────────────────────────────────────────────────
  cargando  = signal(false);
  proyectos = signal<ProyectoListDto[]>([]);

  // ── Reordenamiento ───────────────────────────────────────────────
  modoReorden    = signal(false);
  guardandoOrden = signal(false);
  proyectosOrden = signal<ProyectoListDto[]>([]);
  dragFromIndex  = signal(-1);   // índice origen (para CSS)
  dragToIndex    = signal(-1);   // índice destino (para CSS)

  private ds: DragState = {
    active: false, pointerId: -1,
    fromIndex: -1, toIndex: -1,
    ghost: null, placeholder: null,
    rowHeight: 0, listTop: 0, offsetY: 0,
  };

  // Bound handlers (guardados para poder removeEventListener)
  private readonly _onMove = (e: PointerEvent) => this._handleMove(e);
  private readonly _onUp   = (e: PointerEvent) => this._handleUp(e);

  readonly columnas: DataTableColumn[] = [
    { key: 'app',        label: 'APLICACIÓN' },
    { key: 'plataforma', label: 'PLATAFORMA' },
    { key: 'estado',     label: 'ESTADO' },
    { key: 'version',    label: 'VERSIÓN' },
    { key: 'orden',      label: 'ORDEN', cellClass: 'text-center' },
    { key: 'activo',     label: 'ACTIVO', cellClass: 'text-center' },
    { key: 'acciones',   label: '', cellClass: 'text-end' }
  ];

  // ── Modales ──────────────────────────────────────────────────────
  modalProyectoAbierto = signal(false);
  editandoProyectoId   = signal<number | null>(null);
  proyectoForm: FormGroup;

  modalVistasAbierto   = signal(false);
  proyectoSeleccionado = signal<ProyectoDetalleDto | null>(null);
  vistaForm: FormGroup;

  constructor() {
    this.proyectoForm = this.fb.group({
      codigo:      ['', Validators.required],
      nombre:      ['', Validators.required],
      plataforma:  ['Web', Validators.required],
      iconoCss:    ['bi-box'],
      urlBase:     [''],
      version:     ['1.0.0', Validators.required],
      estado:      ['Produccion', Validators.required],
      descripcion: [''],
      orden:       [0, [Validators.required, Validators.min(0)]]
    });

    this.vistaForm = this.fb.group({
      codigo:      ['', Validators.required],
      nombre:      ['', Validators.required],
      ruta:        ['', Validators.required],
      icono:       ['bi-file-earmark'],
      descripcion: [''],
      orden:       [1, [Validators.required, Validators.min(1)]]
    });

  }

  ngOnInit(): void {
    this.layoutSvc.setSubheader({
      title: 'Catálogo de Aplicaciones',
      showSearch: false,
      showAddButton: this.puedeAdministrar(),
      addButtonLabel: 'Nueva App',
      addHandler: () => this.abrirModalProyecto()
    });
    this.cargarProyectos();
  }

  ngOnDestroy(): void {
    this._cleanupDrag();
    this.destroy$.next();
    this.destroy$.complete();
    this.layoutSvc.resetSubheader();
    this.layoutSvc.closeModal();
  }

  // ── Carga ────────────────────────────────────────────────────────
  cargarProyectos(): void {
    this.cargando.set(true);
    this.saSvc.getProyectos()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const sorted = [...res].sort((a, b) => a.orden - b.orden);
          this.proyectos.set(sorted);
          this.proyectosOrden.set([...sorted]);
          this.cargando.set(false);
        },
        error: () => this.cargando.set(false)
      });
  }

  // ── Modo reorden ─────────────────────────────────────────────────
  activarReorden(): void {
    this.proyectosOrden.set([...this.proyectos()]);
    this.modoReorden.set(true);
  }

  cancelarReorden(): void {
    this._cleanupDrag();
    this.modoReorden.set(false);
  }

  async guardarOrden(): Promise<void> {
    this.guardandoOrden.set(true);
    const items: ProyectoOrdenDto[] = this.proyectosOrden().map((p, i) => ({ id: p.id, orden: i }));

    this.saSvc.reordenarProyectos(items)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.guardandoOrden.set(false);
          this.modoReorden.set(false);
          this.cargarProyectos();
          this.alert.exito('Orden guardado correctamente.');
        },
        error: () => {
          this.guardandoOrden.set(false);
          this.alert.error('No se pudo guardar el orden.');
        }
      });
  }

  // ════════════════════════════════════════
  // DRAG — Pointer Events (mouse + touch)
  // ════════════════════════════════════════

  onHandlePointerDown(event: PointerEvent, index: number): void {
    // Solo primer toque/botón izquierdo; ignorar si ya hay drag activo
    if (this.ds.active) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    const list = this.reorderListRef?.nativeElement;
    if (!list) return;

    // Capturar el pointer en el target para recibir move/up aunque salga del elemento
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    event.preventDefault();

    // Medir la fila fuente
    const rows      = this._getRows();
    const sourceRow = rows[index];
    if (!sourceRow) return;

    const rowRect  = sourceRow.getBoundingClientRect();
    const listRect = list.getBoundingClientRect();

    // ── Ghost: clon flotante ──────────────────────────────────────
    const ghost = sourceRow.cloneNode(true) as HTMLElement;
    ghost.className = 'reorder-ghost';
    ghost.style.cssText = `
      width: ${rowRect.width}px;
      height: ${rowRect.height}px;
      top: ${rowRect.top + window.scrollY}px;
      left: ${rowRect.left}px;
    `;
    document.body.appendChild(ghost);

    // ── Placeholder: hueco en la lista ────────────────────────────
    const ph = document.createElement('div');
    ph.className = 'reorder-placeholder';
    ph.style.height = `${rowRect.height}px`;
    sourceRow.after(ph);
    sourceRow.classList.add('reorder-row--dragging');

    this.ds = {
      active:      true,
      pointerId:   event.pointerId,
      fromIndex:   index,
      toIndex:     index,
      ghost,
      placeholder: ph,
      rowHeight:   rowRect.height,
      listTop:     listRect.top + window.scrollY,
      offsetY:     event.clientY - rowRect.top,
    };

    this.zone.run(() => {
      this.dragFromIndex.set(index);
      this.dragToIndex.set(index);
    });

    // Listeners globales fuera de Angular para no saturar change detection
    this.zone.runOutsideAngular(() => {
      document.addEventListener('pointermove', this._onMove, { passive: false });
      document.addEventListener('pointerup',   this._onUp);
      document.addEventListener('pointercancel', this._onUp);
    });
  }

  private _handleMove(event: PointerEvent): void {
    if (!this.ds.active || event.pointerId !== this.ds.pointerId) return;
    event.preventDefault();

    const { ghost, offsetY, rowHeight } = this.ds;

    // Mover ghost
    const ghostTop = event.clientY - offsetY + window.scrollY;
    ghost!.style.top = `${ghostTop}px`;

    // Calcular nuevo índice destino
    const rows   = this._getRows();
    const listEl = this.reorderListRef?.nativeElement;
    if (!listEl) return;

    const listRect = listEl.getBoundingClientRect();
    const relY     = event.clientY - listRect.top;       // Y relativa a la lista
    let newIndex   = Math.floor(relY / rowHeight);
    newIndex = Math.max(0, Math.min(newIndex, rows.length - 1));

    if (newIndex !== this.ds.toIndex) {
      this.ds.toIndex = newIndex;

      // Mover el placeholder al nuevo destino (manipulación DOM directa)
      const ph = this.ds.placeholder!;
      ph.remove();
      const refRow = rows[newIndex];
      if (newIndex < this.ds.fromIndex) {
        refRow.before(ph);
      } else {
        refRow.after(ph);
      }

      this.zone.run(() => this.dragToIndex.set(newIndex));
    }
  }

  private _handleUp(event: PointerEvent): void {
    if (!this.ds.active || event.pointerId !== this.ds.pointerId) return;

    const { fromIndex, toIndex } = this.ds;
    this._cleanupDrag();

    // Aplicar el nuevo orden solo si cambió
    if (fromIndex !== toIndex) {
      this.zone.run(() => {
        const lista = [...this.proyectosOrden()];
        const [item] = lista.splice(fromIndex, 1);
        // toIndex ya apunta al destino correcto en la lista sin el ítem extraído
        const insertAt = toIndex > fromIndex ? toIndex : toIndex;
        lista.splice(insertAt, 0, item);
        this.proyectosOrden.set(lista);
      });
    }
  }

  private _cleanupDrag(): void {
    document.removeEventListener('pointermove', this._onMove);
    document.removeEventListener('pointerup',   this._onUp);
    document.removeEventListener('pointercancel', this._onUp);

    this.ds.ghost?.remove();
    this.ds.placeholder?.remove();

    // Quitar clase de la fila origen
    this._getRows().forEach(r => r.classList.remove('reorder-row--dragging'));

    this.ds.active    = false;
    this.ds.ghost     = null;
    this.ds.placeholder = null;

    this.dragFromIndex.set(-1);
    this.dragToIndex.set(-1);
  }

  /** Filas reales de la lista (excluye placeholder) */
  private _getRows(): HTMLElement[] {
    const list = this.reorderListRef?.nativeElement;
    if (!list) return [];
    return Array.from(list.querySelectorAll<HTMLElement>('.reorder-row'));
  }

  // ── Modal proyecto ───────────────────────────────────────────────
  async abrirModalProyecto(proj?: ProyectoListDto): Promise<void> {
    await this.layoutSvc.openModal();
    this.proyectoForm.reset({
      plataforma: 'Web', version: '1.0.0', estado: 'Produccion',
      iconoCss: 'bi-box', orden: 0
    });

    if (proj) {
      this.editandoProyectoId.set(proj.id);
      this.proyectoForm.get('codigo')?.disable();
      this.saSvc.getProyectoDetalle(proj.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe(detalle => {
          this.proyectoForm.patchValue({
            codigo: detalle.codigo, nombre: detalle.nombre,
            plataforma: detalle.plataforma, iconoCss: detalle.iconoCss,
            urlBase: detalle.urlBase, version: detalle.version,
            estado: detalle.estado, descripcion: detalle.descripcion,
            orden: detalle.orden
          });
        });
    } else {
      this.editandoProyectoId.set(null);
      this.proyectoForm.get('codigo')?.enable();
    }
    this.modalProyectoAbierto.set(true);
  }

  cerrarModalProyecto(): void {
    this.modalProyectoAbierto.set(false);
    this.layoutSvc.closeModal();
  }

  async guardarProyecto(): Promise<void> {
    if (this.proyectoForm.invalid) return;
    const esEdicion = !!this.editandoProyectoId();
    const formValue = this.proyectoForm.getRawValue();
    const nombre    = formValue.nombre || 'el proyecto';

    const confirmado = esEdicion
      ? await this.alert.confirmarEditar(nombre)
      : await this.alert.confirmarAgregar(nombre);
    if (!confirmado) return;

    if (esEdicion) {
      const req: ActualizarProyectoRequest = {
        nombre: formValue.nombre, plataforma: formValue.plataforma,
        iconoCss: formValue.iconoCss, urlBase: formValue.urlBase,
        estado: formValue.estado, version: formValue.version,
        descripcion: formValue.descripcion, orden: formValue.orden
      };
      this.saSvc.actualizarProyecto(this.editandoProyectoId()!, req)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => { this.cargarProyectos(); this.cerrarModalProyecto(); this.alert.exito(`${nombre} actualizado.`); },
          error: () => this.alert.error(`No se pudo actualizar ${nombre}.`)
        });
    } else {
      const req: CrearProyectoRequest = {
        codigo: formValue.codigo, nombre: formValue.nombre,
        plataforma: formValue.plataforma, iconoCss: formValue.iconoCss,
        urlBase: formValue.urlBase, version: formValue.version,
        descripcion: formValue.descripcion, orden: formValue.orden
      };
      this.saSvc.crearProyecto(req)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => { this.cargarProyectos(); this.cerrarModalProyecto(); this.alert.exito(`${nombre} creado.`); },
          error: () => this.alert.error(`No se pudo crear ${nombre}.`)
        });
    }
  }

  // ── Toggle activo ────────────────────────────────────────────────
  async toggleEstadoProyecto(proj: ProyectoListDto): Promise<void> {
    const accion = proj.activo ? 'desactivar' : 'activar';
    const confirmado = await this.alert.confirmar({
      titulo: `¿${proj.activo ? 'Desactivar' : 'Activar'} aplicación?`,
      texto: `Se ${proj.activo ? 'desactivará' : 'activará'} "${proj.nombre}".`,
      labelConfirmar: proj.activo ? 'Sí, desactivar' : 'Sí, activar',
      labelCancelar: 'Cancelar',
    });
    if (!confirmado) return;

    const accion$ = proj.activo
      ? this.saSvc.desactivarProyecto(proj.id)
      : this.saSvc.activarProyecto(proj.id);

    accion$.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.cargarProyectos(); this.alert.exito(`${proj.nombre} ${proj.activo ? 'desactivado' : 'activado'}.`); },
      error: () => this.alert.error(`No se pudo ${accion} "${proj.nombre}".`)
    });
  }

  // ── Modal vistas ─────────────────────────────────────────────────
  abrirModalVistas(proj: ProyectoListDto): void {
    this.saSvc.getProyectoDetalle(proj.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(detalle => {
        this.proyectoSeleccionado.set(detalle);
        const nextOrden = detalle.vistas.length > 0
          ? Math.max(...detalle.vistas.map(v => v.orden)) + 1 : 1;
        this.vistaForm.reset({ icono: 'bi-circle', descripcion: '', orden: nextOrden });
        this.modalVistasAbierto.set(true);
      });
  }

  async agregarVista(): Promise<void> {
    if (this.vistaForm.invalid || !this.proyectoSeleccionado()) return;
    const projId = this.proyectoSeleccionado()!.id;
    const req: CrearVistaRequest = this.vistaForm.value;

    this.saSvc.crearVistaProyecto(projId, req)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.saSvc.getProyectoDetalle(projId).pipe(takeUntil(this.destroy$)).subscribe(detalle => {
            this.proyectoSeleccionado.set(detalle);
            const nextOrden = detalle.vistas.length > 0
              ? Math.max(...detalle.vistas.map(v => v.orden)) + 1 : 1;
            this.vistaForm.reset({ icono: 'bi-circle', descripcion: '', orden: nextOrden });
            this.cargarProyectos();
          });
          this.alert.exito('Vista agregada correctamente.');
        },
        error: () => this.alert.error('No se pudo agregar la vista.')
      });
  }

  async eliminarVista(vistaId: number): Promise<void> {
    const proj = this.proyectoSeleccionado();
    if (!proj) return;
    const confirmado = await this.alert.confirmar({
      titulo: '¿Eliminar vista?',
      texto: 'Esta acción desactivará la vista del proyecto.',
      labelConfirmar: 'Sí, eliminar', labelCancelar: 'Cancelar',
    });
    if (!confirmado) return;

    this.saSvc.eliminarVistaProyecto(proj.id, vistaId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.proyectoSeleccionado.set({ ...proj, vistas: proj.vistas.filter(v => v.id !== vistaId) });
          this.cargarProyectos();
          this.alert.exito('Vista eliminada correctamente.');
        },
        error: () => this.alert.error('No se pudo eliminar la vista.')
      });
  }

  // ── Helpers ──────────────────────────────────────────────────────
  badgeEstado(proj: ProyectoListDto): 'green' | 'amber' | 'red' {
    if (!proj.activo) return 'red';
    return proj.estado === 'Produccion' ? 'green' : 'amber';
  }

  labelEstado(proj: ProyectoListDto): string {
    if (!proj.activo) return 'Inactivo';
    if (proj.estado === 'Produccion') return 'Producción';
    if (proj.estado === 'Mantenimiento') return 'Mantenimiento';
    return proj.estado;
  }

  iconoPlataforma(p: string): string {
    const m: Record<string, string> = {
      Web: 'bi-globe', Mobile: 'bi-phone', Desktop: 'bi-laptop',
      'Web+Mobile': 'bi-phone', 'Web+Desktop': 'bi-window-sidebar', Todos: 'bi-grid'
    };
    return m[p] ?? 'bi-cpu';
  }

  classeIconoApp(p: string): string {
    if (p === 'Web')    return 'app-icon--web';
    if (p === 'Mobile') return 'app-icon--mobile';
    if (p === 'Desktop') return 'app-icon--desktop';
    return 'app-icon--api';
  }
}