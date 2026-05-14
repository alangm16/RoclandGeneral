import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { LayoutService } from '../../../../../../core/services/layout.service';
import { SuperadminService } from '../../../../services/super-admin.service';
import { BadgeComponent } from '../../../../../../shared/components/badge/badge-component';
import { DataTableComponent, DataTableColumn } from '../../../../../../shared/components/data-table/data-table.component';
import { EmptyStateComponent } from '../../../../../../shared/components/empty-state/empty-state.component';
import { ModalComponent } from '../../../../../../shared/components/modal/modal.component';
import { ViewChild, ElementRef, computed } from '@angular/core';
import { AlertService } from '../../../../../../shared/components/swal-alert/alert.service';
import { AuthService } from '../../../../../../core/auth/auth.service';
import {
  UsuarioDetalleDto,
  ProyectoAsignadoDto,
  ProyectoListDto,
  RolDto,
  AsignarProyectoRolRequest,
  LogAccesoDto,
  DispositivoDto
} from '../../../../models/superadmin.models';

@Component({
  selector: 'app-detalle-usuario',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatButtonModule,
    MatMenuModule,
    BadgeComponent,
    DataTableComponent,
    EmptyStateComponent,
    ModalComponent
  ],
  templateUrl: './detalle-usuario.component.html',
  styleUrls: ['./detalle-usuario.component.scss']
})
export class DetalleUsuarioComponent implements OnInit, OnDestroy {
  private authSvc = inject(AuthService);
  readonly puedeAdministrar = computed(() => {
    const proyecto = this.authSvc.proyectoActivo();
    const rol = proyecto?.rolEnProyecto;
    return rol === 'SuperAdmin' || rol === 'Admin';
  });
  private readonly route        = inject(ActivatedRoute);
  private readonly layoutSvc    = inject(LayoutService);
  private readonly saSvc        = inject(SuperadminService);
  private readonly destroy$     = new Subject<void>();
  private readonly alert = inject(AlertService);
  @ViewChild('btnAsignar') btnAsignar!: ElementRef<HTMLButtonElement>;

  // ── Estado principal ──
  usuario  = signal<UsuarioDetalleDto | null>(null);
  cargando = signal(true);

  // ── Catálogos ──
  proyectosDisponibles        = signal<ProyectoListDto[]>([]);
  rolesProyectoSeleccionado   = signal<RolDto[]>([]);

  // ── Estado de modales ──
  mostrarModalAsignar    = signal(false);
  mostrarModalCambiarRol = signal(false);
  mostrarModalRevocar    = signal(false);

  // ── Selección en modales ──
  proyectoSeleccionadoId = signal<number | null>(null);
  rolSeleccionadoId      = signal<number | null>(null);
  proyectoARevocar: ProyectoAsignadoDto | null = null;

  // ── Subvistas ──
  historialAccesos = signal<LogAccesoDto[]>([]);
  dispositivos     = signal<DispositivoDto[]>([]);

  historialPage = signal(1);
  historialPageSize = signal(10);
  historialTotal = signal(0);

  obtenerTotalPaginas(): number {
    return Math.ceil(this.historialTotal() / this.historialPageSize());
  }


  // ── Columnas de tablas ──
  readonly columnasProyectos: DataTableColumn[] = [
    { key: 'proyecto',  label: 'Proyecto' },
    { key: 'rol',       label: 'Rol' },
    { key: 'nivel',     label: 'Nivel' },
    { key: 'estado',    label: 'Estado' },
    { key: 'acciones',  label: '', cellClass: 'text-end' }
  ];

  readonly columnasHistorial: DataTableColumn[] = [
    { key: 'fecha',          label: 'Fecha' },
    { key: 'proyectoCodigo', label: 'Proyecto' },
    { key: 'plataforma',     label: 'Plataforma' },
    { key: 'exitoso',        label: 'Resultado' }
  ];

  readonly columnasDispositivos: DataTableColumn[] = [
    { key: 'proyecto',        label: 'Proyecto' },
    { key: 'plataforma',      label: 'Plataforma' },
    { key: 'dispositivoInfo', label: 'Dispositivo' },
    { key: 'fechaCreacion',   label: 'Registrado' },
    { key: 'activo',          label: 'Estado' },
    { key: 'acciones',        label: '', cellClass: 'text-end' }
  ];

  // ══════════════════════════════════════════════════════
  // CICLO DE VIDA
  // ══════════════════════════════════════════════════════
  ngOnInit(): void {
    this.layoutSvc.setSubheader({ title: 'Detalle de Usuario', showSearch: false });

    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.saSvc.getUsuario(id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (u) => {
            this.usuario.set(u);
            this.cargando.set(false);
            this.cargarHistorial(u.username);
            this.cargarDispositivos(u.id);
          },
          error: () => this.cargando.set(false)
        });
    } else {
      this.cargando.set(false);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.layoutSvc.resetSubheader();
    this.layoutSvc.closeModal();
  }

  // ══════════════════════════════════════════════════════
  // CARGA DE SUBVISTAS
  // ══════════════════════════════════════════════════════

  private cargarHistorial(username: string, page: number = 1): void {
  this.saSvc.getLogsAcceso({ username }, page, this.historialPageSize())
    .subscribe(result => {
      this.historialAccesos.set(result.items ?? []);
      this.historialTotal.set(result.totalRegistros);
    });
}

  cambiarPaginaHistorial(delta: number): void {
    const nueva = this.historialPage() + delta;
    const totalPaginas = Math.ceil(this.historialTotal() / this.historialPageSize());
    if (nueva >= 1 && nueva <= totalPaginas) {
      this.historialPage.set(nueva);
      this.cargarHistorial(this.usuario()!.username, nueva);
    }
  }

  private cargarDispositivos(usuarioId: number, page: number = 1): void {
    this.saSvc.getDispositivosUsuario(usuarioId, page, 5)
      .subscribe(result => {
        let items: DispositivoDto[] = [];
        if (Array.isArray(result)) {
          items = result;
        } else if (result && 'items' in result) {
          items = result.items;
        }
        this.dispositivos.set(items);
        // también guarda total si lo necesitas
      });
  }

  private recargarUsuario(): void {
    const id = this.usuario()?.id;
    if (!id) return;
    this.saSvc.getUsuario(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(u => {
        this.usuario.set(u);
        this.cargarHistorial(u.username);
        this.cargarDispositivos(u.id);
      });
  }

  // ══════════════════════════════════════════════════════
  // SEGURIDAD
  // ══════════════════════════════════════════════════════
  resetearIntentos(): void {
    const id = this.usuario()?.id;
    if (!id) return;
    this.saSvc.resetearIntentos(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.recargarUsuario());
  }

  // ══════════════════════════════════════════════════════
  // MODAL: ASIGNAR PROYECTO
  // ══════════════════════════════════════════════════════
  async abrirModalAsignar(): Promise<void> {
    this.proyectoSeleccionadoId.set(null);
    this.rolSeleccionadoId.set(null);
    this.rolesProyectoSeleccionado.set([]);

    // getProyectos() ahora devuelve directamente ProyectoListDto[]
    this.saSvc.getProyectos().subscribe(proyectos => {
      const asignados = (this.usuario()?.proyectos ?? []).map(p => p.proyectoId);
      this.proyectosDisponibles.set(proyectos.filter(p => !asignados.includes(p.id)));
    });

    await this.layoutSvc.openModal();
    this.mostrarModalAsignar.set(true);
  }

  cerrarModalAsignar(): void {
    this.mostrarModalAsignar.set(false);
    this.layoutSvc.closeModal();

    queueMicrotask(() => {
      this.btnAsignar?.nativeElement.focus();
    });
  }

  onProyectoChange(proyectoId: number | null): void {
    this.proyectoSeleccionadoId.set(proyectoId);
    this.rolSeleccionadoId.set(null);
    this.rolesProyectoSeleccionado.set([]);

    if (!proyectoId) return;

    this.saSvc.getRolesProyecto(proyectoId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(roles => {
        this.rolesProyectoSeleccionado.set(roles);
        // Pre-seleccionar el primer rol si existe
        if (roles.length > 0) {
          this.rolSeleccionadoId.set(roles[0].id);
        }
      });
  }

  guardarAsignacion(): void {
    const usuarioId  = this.usuario()?.id;
    const proyectoId = this.proyectoSeleccionadoId();
    const rolId      = this.rolSeleccionadoId();
    if (!usuarioId || !proyectoId || !rolId) return;

    const dto: AsignarProyectoRolRequest = { proyectoId, rolId };
    this.saSvc.asignarProyectoRol(usuarioId, dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.cerrarModalAsignar();
        this.recargarUsuario();
      });
  }

  // ══════════════════════════════════════════════════════
  // MODAL: CAMBIAR ROL
  // ══════════════════════════════════════════════════════
  async cambiarRol(proyecto: ProyectoAsignadoDto): Promise<void> {
    this.rolSeleccionadoId.set(null);
    this.rolesProyectoSeleccionado.set([]);

    this.saSvc.getRolesProyecto(proyecto.proyectoId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(roles => {
        this.rolesProyectoSeleccionado.set(roles);
        this.proyectoSeleccionadoId.set(proyecto.proyectoId);
        // Pre-seleccionar el rol actual del usuario
        const rolActual = roles.find(r => r.nombre === proyecto.rol);
        this.rolSeleccionadoId.set(rolActual?.id ?? (roles[0]?.id ?? null));
      });

    await this.layoutSvc.openModal();
    this.mostrarModalCambiarRol.set(true);
  }

  cerrarModalCambiarRol(): void {
    this.mostrarModalCambiarRol.set(false);
    this.layoutSvc.closeModal();
  }

  guardarCambioRol(): void {
    const usuarioId  = this.usuario()?.id;
    const proyectoId = this.proyectoSeleccionadoId();
    const rolId      = this.rolSeleccionadoId();
    if (!usuarioId || !proyectoId || !rolId) return;

    const dto: AsignarProyectoRolRequest = { proyectoId, rolId };
    this.saSvc.asignarProyectoRol(usuarioId, dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.cerrarModalCambiarRol();
        this.recargarUsuario();
      });
  }

  // ══════════════════════════════════════════════════════
  // MODAL: REVOCAR PROYECTO
  // ══════════════════════════════════════════════════════
  async revocarProyecto(proyecto: ProyectoAsignadoDto): Promise<void> {
    this.proyectoARevocar = proyecto;
    await this.layoutSvc.openModal();
    this.mostrarModalRevocar.set(true);
  }

  cerrarModalRevocar(): void {
    this.mostrarModalRevocar.set(false);
    this.proyectoARevocar = null;
    this.layoutSvc.closeModal();
  }

  confirmarRevocar(): void {
    const usuarioId  = this.usuario()?.id;
    const proyectoId = this.proyectoARevocar?.proyectoId;
    if (!usuarioId || !proyectoId) return;

    this.saSvc.revocarProyecto(usuarioId, proyectoId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.cerrarModalRevocar();
        this.recargarUsuario();
      });
  }

  // ══════════════════════════════════════════════════════
  // DISPOSITIVOS
  // ══════════════════════════════════════════════════════
  revocarDispositivo(dispositivoId: number): void {
    this.saSvc.revocarDispositivo(dispositivoId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // Refresca solo dispositivos, no todo el usuario
        const id = this.usuario()?.id;
        if (id) this.cargarDispositivos(id);
      });
  }

  async confirmarRevocarDispositivo(dispositivo: DispositivoDto): Promise<void> {
    const confirmado = await this.alert.confirmar({
      titulo: 'Revocar dispositivo',
      texto: `¿Revocar el token de ${dispositivo.plataforma}? El usuario perderá las notificaciones en este dispositivo.`,
      labelConfirmar: 'Sí, revocar',
      labelCancelar: 'Cancelar'
    });

    if (confirmado) {
      this.revocarDispositivo(dispositivo.id);
    }
  }
}