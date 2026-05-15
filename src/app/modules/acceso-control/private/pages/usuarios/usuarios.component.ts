import {
  Component, OnInit, OnDestroy, inject, signal, computed, Injector
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { Subject, debounceTime, distinctUntilChanged, takeUntil, switchMap } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { LayoutService } from '../../../../../core/services/layout.service';
import { AdminService } from '../../../services/admin.service';
import { DataTableColumn, DataTableComponent } from '../../../../../shared/components/data-table/data-table.component';
import { ModalComponent } from '../../../../../shared/components/modal/modal.component';
import { BadgeComponent } from '../../../../../shared/components/badge/badge-component';
import { GuardiaResumen, GuardiaUpdateDto, UsuarioSinPerfil, CrearPerfilRequest } from '../../../models/admin.models';

@Component({
  selector: 'app-guardias',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatButtonModule, MatMenuModule,
    MatDividerModule, ModalComponent, DataTableComponent, BadgeComponent
  ],
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.scss'],
})
export class GuardiasComponent implements OnInit, OnDestroy {
  public readonly layoutSvc = inject(LayoutService);
  private readonly adminSvc = inject(AdminService);
  private readonly injector = inject(Injector);
  private readonly destroy$ = new Subject<void>();

  guardias = signal<GuardiaResumen[]>([]);
  totalGuardias = signal(0);
  cargando = signal(false);

  paginaActual = signal(1);
  readonly porPagina = 10;
  totalPaginas = computed(() => Math.max(1, Math.ceil(this.totalGuardias() / this.porPagina)));

  guardiaSeleccionado = signal<GuardiaResumen | null>(null);

  mostrarModalImportar = signal(false);
  usuariosCandidatos = signal<UsuarioSinPerfil[]>([]);
  usuarioSeleccionado = signal<UsuarioSinPerfil | null>(null);
  importando = signal(false);
  formImportar = { numeroEmpleado: '', turno: '', activo: true };

  // ── Modal: Editar datos operativos ──
  mostrarModalEditar = signal(false);
  guardandoEditar = signal(false);
  formEditar = { numeroEmpleado: '', turno: '', activo: true };

  // ── Columnas ──
  readonly tableColumns: DataTableColumn[] = [
    { key: 'indice',        label: '#',              headerClass: 'col-index',    cellClass: 'text-mono text-muted col-index' },
    { key: 'nombre',        label: 'Nombre Completo', headerClass: 'col-nombre',   cellClass: 'col-nombre' },
    { key: 'rol',           label: 'Turno',          headerClass: 'col-rol',      cellClass: 'col-rol' },
    { key: 'usuario',       label: 'No. Empleado',   headerClass: 'col-usuario',  cellClass: 'text-mono col-usuario' },
    { key: 'estado',        label: 'Estado Local',    headerClass: 'col-estado',   cellClass: 'col-estado' },
    { key: 'fechaCreacion', label: 'Fecha Alta',      headerClass: 'col-fecha',    cellClass: 'text-mono text-muted col-fecha' },
    { key: 'acciones',      label: '',                headerClass: 'col-actions',  cellClass: 'col-actions' },
  ];

  readonly tableData = computed(() =>
    this.guardias().map((g, i) => ({
      ...g,
      indice: (this.paginaActual() - 1) * this.porPagina + i + 1,
      _raw: g,
    }))
  );

  ngOnInit(): void {
      this.layoutSvc.setSubheader({
      title: 'Usuarios',
      showSearch: true,
      searchPlaceholder: 'Buscar por nombre o rol...',
      showAddButton: true,
      addButtonLabel: 'Importar usuario',
      addHandler: () => this.abrirModalImportar(),
      actions: [
        {
          label: 'Limpiar',
          icon: 'bi-arrow-counterclockwise',
          variant: 'stroked',
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

  // ── Editar datos operativos ──────────────────────────────────
  editarGuardia(guardia: GuardiaResumen): void {
    this.guardiaSeleccionado.set(guardia);
    this.formEditar.numeroEmpleado = guardia.usuario === 'N/A' ? '' : guardia.usuario;
    this.formEditar.turno = guardia.rol === 'Sin turno' ? '' : guardia.rol;
    this.formEditar.activo = guardia.activo; 
    this.mostrarModalEditar.set(true);
  }

  cerrarModalEditar(): void {
    this.mostrarModalEditar.set(false);
    this.guardiaSeleccionado.set(null);
  }

  guardarEdicion(): void {
    const guardia = this.guardiaSeleccionado();
    if (!guardia) return;
    this.guardandoEditar.set(true);
    
    const dto: GuardiaUpdateDto = {
      numeroEmpleado: this.formEditar.numeroEmpleado || null,
      turno: this.formEditar.turno || null,
    };
    
    // Primero actualizar datos operativos
    this.adminSvc.actualizarGuardia(guardia.id, dto).pipe(
      switchMap(() => this.adminSvc.cambiarEstadoGuardia(guardia.id, this.formEditar.activo)),
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.guardandoEditar.set(false); // 
        this.cerrarModalEditar();
        this.cargarGuardias();
      },
      error: () => this.guardandoEditar.set(false),
    });
  }

  abrirModalImportar(): void {
    this.usuariosCandidatos.set([]);
    this.usuarioSeleccionado.set(null);
    this.formImportar = { numeroEmpleado: '', turno: '', activo: true };
    this.mostrarModalImportar.set(true);
    this.cargarCandidatos();
  }

  cargarCandidatos(): void {
    this.adminSvc.obtenerUsuariosSinPerfil()
      .pipe(takeUntil(this.destroy$))
      .subscribe(lista => this.usuariosCandidatos.set(lista));
  }

  onUsuarioSeleccionado(event: any): void {
    const id = +event.target.value;
    const usuario = this.usuariosCandidatos().find(u => u.superAdminUsuarioId === id);
    this.usuarioSeleccionado.set(usuario || null);
  }

  crearPerfil(): void {
    const usuario = this.usuarioSeleccionado();
    if (!usuario) return;
    this.importando.set(true);
    
    const request: CrearPerfilRequest = {
      superAdminUsuarioId: usuario.superAdminUsuarioId,
      numeroEmpleado: this.formImportar.numeroEmpleado || null,
      turno: this.formImportar.turno || null,
      activo: this.formImportar.activo
    };
    
    this.adminSvc.crearPerfil(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.importando.set(false); // 
          this.cerrarModalImportar();
          this.cargarGuardias();
        },
        error: () => this.importando.set(false)
      });
  }

  cerrarModalImportar(): void {
    this.mostrarModalImportar.set(false);
    this.usuarioSeleccionado.set(null);
    this.guardandoEditar.set(false);
    this.importando.set(false);
  }
}