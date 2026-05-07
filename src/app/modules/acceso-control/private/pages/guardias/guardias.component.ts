import {
  Component, OnInit, OnDestroy, inject, signal, computed, Injector
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
import { GuardiaResumen, GuardiaUpdateDto } from '../../../models/admin.models';
import { AuthService } from '../../../../../core/auth/auth.service';

// ─────────────────────────────────────────────────────────────────
@Component({
  selector: 'app-guardias', // Puedes mantener este selector o cambiarlo a app-usuarios luego
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatButtonModule, MatMenuModule, 
    MatDividerModule, ModalComponent, DataTableComponent, BadgeComponent
  ],
  templateUrl: './guardias.component.html',
  styleUrls: [],
})
export class GuardiasComponent implements OnInit, OnDestroy {
  public readonly layoutSvc = inject(LayoutService);
  private readonly adminSvc = inject(AdminService);
  private readonly injector = inject(Injector);
  private readonly destroy$ = new Subject<void>();

  guardias      = signal<GuardiaResumen[]>([]);
  totalGuardias = signal(0);
  cargando      = signal(false);

  paginaActual   = signal(1);
  readonly porPagina = 10;
  totalPaginas   = computed(() => Math.max(1, Math.ceil(this.totalGuardias() / this.porPagina)));

  guardiaSeleccionado = signal<GuardiaResumen | null>(null);

  // ── Modal: Editar (Solo permite asignar Turno/Numero Empleado si lo requieres luego)
  mostrarModalEditar = signal(false);
  guardandoEditar    = signal(false);
  errorGlobalEditar  = signal('');
  formEditar = { activo: true }; // Nota: El nombre ya no se edita aquí, viene de SuperAdmin.

  // ── Modal: Toggle estado
  mostrarModalToggle = signal(false);
  guardandoToggle    = signal(false);

  // ── Columnas Actualizadas ──
  readonly tableColumns: DataTableColumn[] = [
    { key: 'indice',        label: '#',          headerClass: 'col-index',    cellClass: 'text-mono text-muted col-index' },
    { key: 'nombre',        label: 'Nombre Completo', headerClass: 'col-nombre',   cellClass: 'col-nombre' },
    { key: 'rol',           label: 'Rol',        headerClass: 'col-rol',      cellClass: 'col-rol' }, 
    { key: 'usuario',       label: 'No. Empleado', headerClass: 'col-usuario',  cellClass: 'text-mono col-usuario' }, 
    { key: 'estado',        label: 'Estado Local', headerClass: 'col-estado',   cellClass: 'col-estado' },
    { key: 'fechaCreacion', label: 'Fecha Alta',   headerClass: 'col-fecha',    cellClass: 'text-mono text-muted col-fecha' },
    { key: 'acciones',      label: '',           headerClass: 'col-actions',  cellClass: 'col-actions' },
  ];

  readonly tableData = computed(() =>
    this.guardias().map((g, i) => ({
      ...g,
      indice: (this.paginaActual() - 1) * this.porPagina + i + 1,
      _raw: g,
    }))
  );

  readonly authSvc = inject(AuthService);
  readonly miId = computed(() => this.authSvc.miPerfilId());
  readonly miRol = computed(() => this.authSvc.rolActual());

  ngOnInit(): void {
    this.layoutSvc.setSubheader({
      title: 'Usuarios', // Cambio de título
      showSearch: true,
      searchPlaceholder: 'Buscar por nombre o rol...',
      showAddButton: false, // 
      actions: [
        {
          label: 'Limpiar',
          icon: 'bi-arrow-counterclockwise',
          variant: 'stroked' as const,
          handler: () => this.layoutSvc.onSearchInput('')
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

  // ── Toggle estado ────────────────────────────────────────
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
      nombre: guardia.nombre, // Solo lo mandamos por compatibilidad con el DTO actual
      activo: !guardia.activo,
    };

    this.adminSvc.actualizarGuardia(guardia.id, dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.cerrarModalToggle();
          this.cargarGuardias();
          this.guardandoToggle.set(false);
        },
        error: () => {
          this.guardandoToggle.set(false);
        },
      });
  }
}