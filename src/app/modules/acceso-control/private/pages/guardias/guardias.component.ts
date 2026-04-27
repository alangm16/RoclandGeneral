import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  Injector,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { LayoutService } from '../../../../../core/services/layout.service';
import { AdminService } from '../../../services/admin.service';
import { DataTableColumn, DataTableComponent } from '../../../../../shared/components/data-table/data-table.component';
import { ModalComponent } from '../../../../../shared/components/modal/modal.component';
import { BadgeComponent } from '../../../../../shared/components/badge/badge-component';
import { GuardiaResumen, GuardiaCreateDto, GuardiaUpdateDto } from '../../../models/admin.models';

// ─────────────────────────────────────────────────────────────────
@Component({
  selector: 'app-guardias',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule,
    ModalComponent,
    DataTableComponent,
    BadgeComponent,
  ],
  templateUrl: './guardias.component.html',
  styleUrls: ['./guardias.component.scss'],
})
export class GuardiasComponent implements OnInit, OnDestroy {
  public readonly layoutSvc = inject(LayoutService);
  private readonly adminSvc = inject(AdminService);
  private readonly injector = inject(Injector);
  private readonly destroy$ = new Subject<void>();

  // ── Tabla ──────────────────────────────────────────────────────
  guardias      = signal<GuardiaResumen[]>([]);
  totalGuardias = signal(0);
  cargando      = signal(false);

  // ── Paginación ─────────────────────────────────────────────────
  paginaActual   = signal(1);
  readonly porPagina = 10;
  totalPaginas   = computed(() => Math.max(1, Math.ceil(this.totalGuardias() / this.porPagina)));

  // ── Guardia seleccionado (compartido por editar / reset / toggle) ──
  guardiaSeleccionado = signal<GuardiaResumen | null>(null);

  // ── Modal: Nuevo ────────────────────────────────────────────────
  mostrarModalNuevo  = signal(false);
  guardandoNuevo     = signal(false);
  errorGlobalNuevo   = signal('');
  mostrarPwdNuevo    = false;
  formNuevo: GuardiaCreateDto = { nombre: '', usuario: '', password: '' };
  erroresNuevo: Partial<Record<keyof GuardiaCreateDto, string>> = {};

  // ── Modal: Editar ───────────────────────────────────────────────
  mostrarModalEditar = signal(false);
  guardandoEditar    = signal(false);
  errorGlobalEditar  = signal('');
  formEditar = { nombre: '' };
  erroresEditar: { nombre?: string } = {};

  // ── Modal: Reset pwd ────────────────────────────────────────────
  mostrarModalReset  = signal(false);
  guardandoReset     = signal(false);
  errorGlobalReset   = signal('');
  mostrarPwdReset    = false;
  formReset = { password: '' };
  erroresReset: { password?: string } = {};

  // ── Modal: Toggle estado ────────────────────────────────────────
  mostrarModalToggle = signal(false);
  guardandoToggle    = signal(false);

  // ── Columnas ────────────────────────────────────────────────────
  readonly tableColumns: DataTableColumn[] = [
    { key: 'indice',        label: '#',          headerClass: 'col-index',    cellClass: 'text-mono text-muted col-index' },
    { key: 'nombre',        label: 'Nombre',     headerClass: 'col-nombre',   cellClass: 'col-nombre' },
    { key: 'usuario',       label: 'Usuario',    headerClass: 'col-usuario',  cellClass: 'text-mono col-usuario' },
    { key: 'estado',        label: 'Estado',     headerClass: 'col-estado',   cellClass: 'col-estado' },
    { key: 'fechaCreacion', label: 'Fecha Alta', headerClass: 'col-fecha',    cellClass: 'text-mono text-muted col-fecha' },
    { key: 'acciones',      label: '',           headerClass: 'col-actions',  cellClass: 'col-actions' },
  ];

  // ── Datos mapeados para la tabla ────────────────────────────────
  readonly tableData = computed(() =>
    this.guardias().map((g, i) => ({
      ...g,
      indice: (this.paginaActual() - 1) * this.porPagina + i + 1,
      _raw: g,
    }))
  );

  // ── Lifecycle ──────────────────────────────────────────────────
  ngOnInit(): void {
    this.layoutSvc.setSubheader({
      title: 'Guardias',
      showSearch: true,
      searchPlaceholder: 'Buscar por nombre o usuario...',
      actions: [
        {
          label: 'Buscar',
          icon: 'bi-search',
          variant: 'flat' as const,
          color: 'primary',
          handler: () => {
            this.paginaActual.set(1);
            this.cargarGuardias();
          },
        },
        {
          label: 'Limpiar',
          icon: 'bi-arrow-counterclockwise',
          variant: 'stroked' as const,
          handler: () => this.layoutSvc.onSearchInput(''),
        },
        {
          label: 'Nuevo guardia',
          icon: 'bi-shield-plus',
          variant: 'flat' as const,
          color: 'primary',
          handler: () => this.abrirModalNuevo(),
        },
      ],
    });

    toObservable(this.layoutSvc.searchValue, { injector: this.injector })
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.paginaActual.set(1);
        this.cargarGuardias();
      });

    this.cargarGuardias();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.layoutSvc.resetSubheader();
    this.layoutSvc.closeModal();
  }

  // ── Carga de datos ─────────────────────────────────────────────
  cargarGuardias(): void {
    this.cargando.set(true);
    const busqueda = this.layoutSvc.searchValue().trim();

    this.adminSvc.getGuardias(this.paginaActual(), this.porPagina, busqueda)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.guardias.set(res.items);
          this.totalGuardias.set(res.total);
          this.cargando.set(false);
        },
        error: () => this.cargando.set(false),
      });
  }

  cambiarPagina(delta: number): void {
    const nueva = this.paginaActual() + delta;
    if (nueva >= 1 && nueva <= this.totalPaginas()) {
      this.paginaActual.set(nueva);
      this.cargarGuardias();
    }
  }

  // ── Modal: Nuevo ────────────────────────────────────────────────
  abrirModalNuevo(): void {
    this.formNuevo   = { nombre: '', usuario: '', password: '' };
    this.erroresNuevo = {};
    this.errorGlobalNuevo.set('');
    this.mostrarPwdNuevo = false;
    this.mostrarModalNuevo.set(true);
  }

  cerrarModalNuevo(): void {
    this.mostrarModalNuevo.set(false);
  }

  crearGuardia(): void {
    this.erroresNuevo = {};
    this.errorGlobalNuevo.set('');

    const { nombre, usuario, password } = this.formNuevo;
    let valido = true;

    if (!nombre.trim()) {
      this.erroresNuevo.nombre = 'El nombre es requerido.';
      valido = false;
    }
    if (!usuario.trim()) {
      this.erroresNuevo.usuario = 'El usuario es requerido.';
      valido = false;
    }
    if (!password || password.length < 6) {
      this.erroresNuevo.password = 'La contraseña debe tener al menos 6 caracteres.';
      valido = false;
    }
    if (!valido) return;

    this.guardandoNuevo.set(true);

    this.adminSvc.crearGuardia({ nombre: nombre.trim(), usuario: usuario.trim(), password })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.cerrarModalNuevo();
          this.cargarGuardias();
        },
        error: () => {
          this.errorGlobalNuevo.set('No se pudo crear. El usuario ya existe o hubo un error.');
          this.guardandoNuevo.set(false);
        },
      });
  }

  // ── Modal: Editar nombre ────────────────────────────────────────
  abrirEditar(guardia: GuardiaResumen): void {
    this.guardiaSeleccionado.set(guardia);
    this.formEditar  = { nombre: guardia.nombre };
    this.erroresEditar = {};
    this.errorGlobalEditar.set('');
    this.mostrarModalEditar.set(true);
  }

  cerrarModalEditar(): void {
    this.mostrarModalEditar.set(false);
    this.guardiaSeleccionado.set(null);
  }

  guardarEditar(): void {
    this.erroresEditar = {};
    this.errorGlobalEditar.set('');

    const guardia = this.guardiaSeleccionado();
    if (!guardia) return;

    if (!this.formEditar.nombre.trim()) {
      this.erroresEditar.nombre = 'El nombre es requerido.';
      return;
    }

    this.guardandoEditar.set(true);

    const dto: GuardiaUpdateDto = {
      nombre: this.formEditar.nombre.trim(),
      activo: guardia.activo,
    };

    this.adminSvc.actualizarGuardia(guardia.id, dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.cerrarModalEditar();
          this.cargarGuardias();
        },
        error: () => {
          this.errorGlobalEditar.set('No se pudo actualizar. Intenta de nuevo.');
          this.guardandoEditar.set(false);
        },
      });
  }

  // ── Modal: Reset contraseña ─────────────────────────────────────
  abrirReset(guardia: GuardiaResumen): void {
    this.guardiaSeleccionado.set(guardia);
    this.formReset  = { password: '' };
    this.erroresReset = {};
    this.errorGlobalReset.set('');
    this.mostrarPwdReset = false;
    this.mostrarModalReset.set(true);
  }

  cerrarModalReset(): void {
    this.mostrarModalReset.set(false);
    this.guardiaSeleccionado.set(null);
  }

  confirmarReset(): void {
    this.erroresReset = {};
    this.errorGlobalReset.set('');

    const guardia = this.guardiaSeleccionado();
    if (!guardia) return;

    if (!this.formReset.password || this.formReset.password.length < 6) {
      this.erroresReset.password = 'La contraseña debe tener al menos 6 caracteres.';
      return;
    }

    this.guardandoReset.set(true);

    this.adminSvc.resetPasswordGuardia(guardia.id, this.formReset.password)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.cerrarModalReset();
        },
        error: () => {
          this.errorGlobalReset.set('No se pudo actualizar la contraseña. Intenta de nuevo.');
          this.guardandoReset.set(false);
        },
      });
  }

  // ── Modal: Toggle estado ────────────────────────────────────────
  toggleEstado(guardia: GuardiaResumen): void {
    this.guardiaSeleccionado.set(guardia);
    this.mostrarModalToggle.set(true);
  }

  cerrarModalToggle(): void {
    this.mostrarModalToggle.set(false);
    this.guardiaSeleccionado.set(null);
  }

  confirmarToggle(): void {
    const guardia = this.guardiaSeleccionado();
    if (!guardia) return;

    this.guardandoToggle.set(true);

    const dto: GuardiaUpdateDto = {
      nombre: guardia.nombre,
      activo: !guardia.activo,
    };

    this.adminSvc.actualizarGuardia(guardia.id, dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.cerrarModalToggle();
          this.cargarGuardias();
        },
        error: () => {
          this.guardandoToggle.set(false);
        },
      });
  }
}