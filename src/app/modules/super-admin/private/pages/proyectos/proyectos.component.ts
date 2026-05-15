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
import { RouterModule } from '@angular/router';
import { takeUntil } from 'rxjs/operators';

import { LayoutService } from '../../../../../core/services/layout.service';
import { SuperadminService } from '../../../services/super-admin.service';
import { AuthService } from '../../../../../core/auth/auth.service';
import { AlertService } from '../../../../../shared/components/swal-alert/alert.service';
import { DataTableComponent, DataTableColumn } from '../../../../../shared/components/data-table/data-table.component';
import { ModalComponent } from '../../../../../shared/components/modal/modal.component';
import { BadgeComponent } from '../../../../../shared/components/badge/badge-component';

import {
  ProyectoListDto,
  CrearProyectoRequest,
  ProyectoOrdenDto,
} from '../../../models/superadmin.models';

interface DragState {
  active:       boolean;
  pointerId:    number;
  fromIndex:    number;
  toIndex:      number;
  ghost:        HTMLElement | null;
  placeholder:  HTMLElement | null;
  rowHeight:    number;
  listTop:      number;
  offsetY:      number;
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
  dragFromIndex  = signal(-1);   // solo para CSS

  private ds: DragState = {
    active: false, pointerId: -1,
    fromIndex: -1, toIndex: -1,
    ghost: null, placeholder: null,
    rowHeight: 0, listTop: 0, offsetY: 0,
  };

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

  // ── Modal crear proyecto ─────────────────────────────────────────
  modalProyectoAbierto = signal(false);
  proyectoForm: FormGroup;

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
    if (this.ds.active) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    const list = this.reorderListRef?.nativeElement;
    if (!list) return;

    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    event.preventDefault();

    const rows      = this._getRows();
    const sourceRow = rows[index];
    if (!sourceRow) return;

    const rowRect  = sourceRow.getBoundingClientRect();
    const listRect = list.getBoundingClientRect();

    // Ghost flotante
    const ghost = sourceRow.cloneNode(true) as HTMLElement;
    ghost.className = 'reorder-ghost';
    ghost.style.cssText = `
      width: ${rowRect.width}px;
      height: ${rowRect.height}px;
      top: ${rowRect.top + window.scrollY}px;
      left: ${rowRect.left}px;
    `;
    document.body.appendChild(ghost);

    // Placeholder
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

    this.zone.run(() => this.dragFromIndex.set(index));

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

    const ghostTop = event.clientY - offsetY + window.scrollY;
    ghost!.style.top = `${ghostTop}px`;

    const rows   = this._getRows();
    const listEl = this.reorderListRef?.nativeElement;
    if (!listEl) return;

    const listRect = listEl.getBoundingClientRect();
    const relY     = event.clientY - listRect.top;
    let newIndex   = Math.floor(relY / rowHeight);
    newIndex = Math.max(0, Math.min(newIndex, rows.length - 1));

    if (newIndex !== this.ds.toIndex) {
      this.ds.toIndex = newIndex;

      const ph = this.ds.placeholder!;
      ph.remove();
      const refRow = rows[newIndex];
      if (newIndex < this.ds.fromIndex) {
        refRow.before(ph);
      } else {
        refRow.after(ph);
      }
    }
  }

  private _handleUp(event: PointerEvent): void {
    if (!this.ds.active || event.pointerId !== this.ds.pointerId) return;

    const { fromIndex, toIndex } = this.ds;
    this._cleanupDrag();

    if (fromIndex !== toIndex) {
      this.zone.run(() => {
        const lista = [...this.proyectosOrden()];
        const [item] = lista.splice(fromIndex, 1);
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
    this._getRows().forEach(r => r.classList.remove('reorder-row--dragging'));

    this.ds.active    = false;
    this.ds.ghost     = null;
    this.ds.placeholder = null;
    this.dragFromIndex.set(-1);
  }

  private _getRows(): HTMLElement[] {
    const list = this.reorderListRef?.nativeElement;
    return list ? Array.from(list.querySelectorAll<HTMLElement>('.reorder-row')) : [];
  }

  // ── Modal crear proyecto (solo creación) ─────────────────────────
  async abrirModalProyecto(): Promise<void> {
    await this.layoutSvc.openModal();
    this.proyectoForm.reset({
      plataforma: 'Web',
      version: '1.0.0',
      estado: 'Produccion',
      iconoCss: 'bi-box',
      orden: 0,
      codigo: '',
      nombre: '',
      urlBase: '',
      descripcion: ''
    });
    this.modalProyectoAbierto.set(true);
  }

  cerrarModalProyecto(): void {
    this.modalProyectoAbierto.set(false);
    this.layoutSvc.closeModal();
  }

  async guardarProyecto(): Promise<void> {
    if (this.proyectoForm.invalid) return;
    const formValue = this.proyectoForm.getRawValue();
    const nombre = formValue.nombre || 'la aplicación';

    const confirmado = await this.alert.confirmarAgregar(nombre);
    if (!confirmado) return;

    const req: CrearProyectoRequest = {
      codigo: formValue.codigo,
      nombre: formValue.nombre,
      plataforma: formValue.plataforma,
      iconoCss: formValue.iconoCss,
      urlBase: formValue.urlBase,
      version: formValue.version,
      descripcion: formValue.descripcion,
      orden: formValue.orden
    };

    this.saSvc.crearProyecto(req)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.cargarProyectos();
          this.cerrarModalProyecto();
          this.alert.exito(`${nombre} creado.`);
        },
        error: () => this.alert.error(`No se pudo crear ${nombre}.`)
      });
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
      next: () => {
        this.cargarProyectos();
        this.alert.exito(`${proj.nombre} ${proj.activo ? 'desactivado' : 'activado'}.`);
      },
      error: () => this.alert.error(`No se pudo ${accion} "${proj.nombre}".`)
    });
  }

  // ── Helpers para badges ──────────────────────────────────────────
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
}