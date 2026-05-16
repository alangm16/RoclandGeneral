import { Component, OnInit, OnDestroy, inject, signal, computed, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, Observable } from 'rxjs';
import { RouterModule } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { LayoutService } from '../../../../../core/services/layout.service';
import { SuperadminService } from '../../../services/super-admin.service';
import { DataTableComponent, DataTableColumn } from '../../../../../shared/components/data-table/data-table.component';
import { ModalComponent } from '../../../../../shared/components/modal/modal.component';
import { BadgeComponent } from '../../../../../shared/components/badge/badge-component';
import { UsuarioListDto, CrearUsuarioRequest, ActualizarUsuarioRequest } from '../../../models/superadmin.models';
import { map, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AlertService } from '../../../../../shared/components/swal-alert/alert.service';
import { AuthService } from '../../../../../core/auth/auth.service';
import { combineLatest } from 'rxjs';

@Component({
  selector: 'app-superadmin-usuarios',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatButtonModule, MatMenuModule,
    RouterModule,
    DataTableComponent, ModalComponent, BadgeComponent
  ],
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.scss']
})
export class UsuariosComponent implements OnInit, OnDestroy {
  private readonly layoutSvc = inject(LayoutService);
  private readonly saSvc = inject(SuperadminService);
  private readonly fb = inject(FormBuilder);
  private readonly injector = inject(Injector);
  private readonly destroy$ = new Subject<void>();
  private ultimoFoco: HTMLElement | null = null;
  private readonly alert = inject(AlertService);
  private authSvc = inject(AuthService);

  readonly puedeAdministrar = computed(() => {
    const proyecto = this.authSvc.proyectoActivo();
    const rol = proyecto?.rolEnProyecto;
    return rol === 'SuperAdmin' || rol === 'Admin';
  });

  cargando = signal(false);
  usuarios = signal<UsuarioListDto[]>([]);
  totalUsuarios = signal(0);
  paginaActual = signal(1);
  readonly porPagina = 20;
  totalPaginas = computed(() => Math.max(1, Math.ceil(this.totalUsuarios() / this.porPagina)));

  readonly columnas: DataTableColumn[] = [
    { key: 'usuario',   label: 'USUARIO' },
    { key: 'estado',    label: 'ESTADO' },
    { key: 'ultimoAcceso', label: 'ÚLTIMO ACCESO' },
    { key: 'bloqueado', label: 'SEGURIDAD' },
    { key: 'acciones',  label: '', cellClass: 'text-end' }
  ];

  // ── Modal ──
  modalPerfilAbierto = signal(false);
  editandoId = signal<number | null>(null);
  usuarioForm: FormGroup;

  constructor() {
    this.usuarioForm = this.fb.group({
      nombreCompleto: ['', Validators.required],
      username: ['', Validators.required],
      email: [''],
      password: [''],
      qrcode: ['']
    });
  }

  ngOnInit(): void {
  // Configurar subheader con filtros directamente
  this.layoutSvc.setSubheader({
    title: 'Directorio Global',
    showSearch: true,
    showAddButton: this.puedeAdministrar(),
    addButtonLabel: 'Nuevo Usuario',
    addHandler: () => this.abrirModalPerfil(),
    filters: [
      {
        type: 'select',
        key: 'estado',
        options: [
          { label: 'Activo', value: 'activo' },
          { label: 'Inactivo', value: 'inactivo' },
          { label: 'Todos', value: 'todos' }
        ],
        defaultValue: 'activo'
      }
    ]
  });

  this.layoutSvc.filterValues.update(f => ({ ...f, estado: 'activo' }));

  // Reaccionar a cambios en búsqueda y filtros
  combineLatest([
    toObservable(this.layoutSvc.searchValue, { injector: this.injector }),
    toObservable(this.layoutSvc.filterValues, { injector: this.injector })
  ])
    .pipe(
      debounceTime(400),
      distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
      takeUntil(this.destroy$)
    )
    .subscribe(() => {
      this.paginaActual.set(1);
      this.cargarUsuarios();
    });

  this.cargarUsuarios();
}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.layoutSvc.resetSubheader();
    this.layoutSvc.closeModal();
  }

  cargarUsuarios(): void {
    this.cargando.set(true);
    const busqueda = this.layoutSvc.searchValue().trim();
    const estado = this.layoutSvc.filterValues()['estado'] || 'activo';
    let activoParam: boolean | undefined;
    if (estado === 'activo') activoParam = true;
    else if (estado === 'inactivo') activoParam = false;
    else activoParam = undefined;

    this.saSvc.getUsuarios(this.paginaActual(), this.porPagina, false, activoParam)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
            next: (res) => {
                let items = res.items;
                if (busqueda) {
                    const l = busqueda.toLowerCase();
                    items = items.filter(u =>
                        u.nombreCompleto.toLowerCase().includes(l) ||
                        u.username.toLowerCase().includes(l) ||
                        (u.email?.toLowerCase().includes(l))
                    );
                }
                this.usuarios.set(items);
                this.totalUsuarios.set(res.totalRegistros);
                this.cargando.set(false);
            },
            error: () => this.cargando.set(false)
        });
}

  cambiarPagina(delta: number): void {
    const nueva = this.paginaActual() + delta;
    if (nueva >= 1 && nueva <= this.totalPaginas()) {
      this.paginaActual.set(nueva);
      this.cargarUsuarios();
    }
  }

  // ── Abrir modal (cierra sidebar automáticamente) ──
  async abrirModalPerfil(user?: UsuarioListDto): Promise<void> {
    this.ultimoFoco = document.activeElement as HTMLElement;
    await this.layoutSvc.openModal();

    this.usuarioForm.reset();
    if (user) {
      this.editandoId.set(user.id);
      // Obtener el detalle para conocer el rolSAId real
      this.saSvc.getUsuario(user.id).pipe(takeUntil(this.destroy$)).subscribe(detalle => {
      this.usuarioForm.patchValue({
        nombreCompleto: detalle.nombreCompleto,
        username: detalle.username,
        email: detalle.email
      });
    });
      this.usuarioForm.get('username')?.disable();
      this.usuarioForm.get('password')?.clearValidators();
    } else {
      this.editandoId.set(null);
      this.usuarioForm.get('username')?.enable();
      this.usuarioForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    }
    this.usuarioForm.get('password')?.updateValueAndValidity();
    this.modalPerfilAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalPerfilAbierto.set(false);
    this.layoutSvc.closeModal();
    setTimeout(() => {
      this.ultimoFoco?.focus();
      this.ultimoFoco = null;
    });
  }

  async guardarUsuario(): Promise<void> {
    if (this.usuarioForm.invalid) return;

    const esEdicion = !!this.editandoId();
    const formValue = this.usuarioForm.getRawValue();
    const nombre = formValue.nombreCompleto || 'el usuario';

    const confirmado = esEdicion
      ? await this.alert.confirmarEditar(nombre)
      : await this.alert.confirmarAgregar(nombre);

    if (!confirmado) return;

    const request: ActualizarUsuarioRequest = {
      nombreCompleto: formValue.nombreCompleto,
      email: formValue.email ?? null,
      password: formValue.password || null,
      qrcode: formValue.qrcode || null 
    };

    const accion$: Observable<void> = esEdicion
      ? this.saSvc.actualizarUsuario(this.editandoId()!, request).pipe(map(() => undefined))
      : this.saSvc.crearUsuario({
          nombreCompleto: formValue.nombreCompleto,
          username: formValue.username,
          email: formValue.email ?? null,
          password: formValue.password,
          qrcode: formValue.qrcode ?? null
        }).pipe(map(() => undefined));

    accion$.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.cargarUsuarios();
        this.cerrarModal();
        this.alert.exito(
          esEdicion ? `${nombre} fue actualizado correctamente.` : `${nombre} fue creado correctamente.`
        );
      },
      error: () => this.alert.error(
        esEdicion ? `No se pudo actualizar ${nombre}.` : `No se pudo crear ${nombre}.`
      )
    });
  }

  async toggleEstado(user: UsuarioListDto): Promise<void> {
    const accion = user.activo ? 'desactivar' : 'activar';
    const confirmado = await this.alert.confirmar({
      titulo: `¿${user.activo ? 'Desactivar' : 'Activar'} usuario?`,
      texto: `Se ${user.activo ? 'desactivará' : 'activará'} la cuenta de ${user.nombreCompleto}.`,
      labelConfirmar: user.activo ? 'Sí, desactivar' : 'Sí, activar',
      labelCancelar: 'Cancelar',  // ← deja solo "Cancelar", sin "No"
    });

    if (!confirmado) return;

    const accion$ = user.activo
      ? this.saSvc.desactivarUsuario(user.id)
      : this.saSvc.activarUsuario(user.id);

    accion$.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.cargarUsuarios();
        this.alert.exito(`${user.nombreCompleto} fue ${user.activo ? 'desactivado' : 'activado'} correctamente.`);
      },
      error: () => this.alert.error(`No se pudo ${accion} a ${user.nombreCompleto}.`)
    });
  }

  async resetearIntentos(user: UsuarioListDto): Promise<void> {
    const confirmado = await this.alert.confirmar({
      titulo: '¿Resetear intentos?',
      texto: `Se desbloqueará la cuenta de ${user.nombreCompleto}.`,
      labelConfirmar: 'Sí, resetear',
    });

    if (!confirmado) return;

    this.saSvc.resetearIntentos(user.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.cargarUsuarios();
          this.alert.exito(`Intentos de ${user.nombreCompleto} reseteados correctamente.`);
        },
        error: () => this.alert.error(`No se pudo resetear los intentos de ${user.nombreCompleto}.`)
      });
  }
}