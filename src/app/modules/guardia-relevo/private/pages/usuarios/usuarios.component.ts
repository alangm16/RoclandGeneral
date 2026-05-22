import {
  Component, OnInit, OnDestroy, inject, signal, computed, Injector, effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil, switchMap, firstValueFrom } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { MatMenuModule } from '@angular/material/menu';
import { LayoutService } from '../../../../../core/services/layout.service';
import { GuardiaRelevoService } from '../../../services/guardia-relevo.service';
import { AlertService } from '../../../../../shared/components/swal-alert/alert.service';
import { DataTableColumn, DataTableComponent } from '../../../../../shared/components/data-table/data-table.component';
import { ModalComponent } from '../../../../../shared/components/modal/modal.component';
import { BadgeComponent } from '../../../../../shared/components/badge/badge-component';
import {
  PerfilSummary,
  ActualizarPerfilRequest,
  UsuarioSuperAdminAsignadoDto,
  CrearPerfilRequest,
  ConfiguracionAppResponse,
  UpdateConfiguracionAppRequest
} from '../../../models/guardia-relevo.models';

@Component({
  selector: 'app-guardia-relevo-usuarios',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatMenuModule,
    DataTableComponent,
    ModalComponent,
    BadgeComponent
  ],
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.scss']
})
export class UsuariosComponent implements OnInit, OnDestroy {
  private layoutSvc = inject(LayoutService);
  private grService = inject(GuardiaRelevoService);
  private alert = inject(AlertService);
  private destroy$ = new Subject<void>();

  // Estado de carga
  cargando = signal(false);

  // Lista de perfiles (guardias, supervisores, gerentes)
  perfiles = signal<PerfilSummary[]>([]);
  totalRegistros = signal(0);
  paginaActual = signal(1);
  readonly porPagina = 12;
  totalPaginas = computed(() => Math.max(1, Math.ceil(this.totalRegistros() / this.porPagina)));

  // Columnas para la tabla
  columnas: DataTableColumn[] = [
    { key: 'nombreCompleto', label: 'NOMBRE COMPLETO' },
    { key: 'numeroEmpleado', label: 'Nº EMPLEADO', cellClass: 'text-mono' },
    { key: 'turno', label: 'TURNO BASE' },
    { key: 'activo', label: 'ESTADO', cellClass: 'text-center' },
    { key: 'acciones', label: '', cellClass: 'text-end' }
  ];

  // Perfil seleccionado para editar
  perfilSeleccionado = signal<PerfilSummary | null>(null);
  mostrarModalEditar = signal(false);
  guardandoEditar = signal(false);
  formEditar = { numeroEmpleado: '', turno: '', activo: true };

  // Modal para importar nuevo perfil desde SuperAdmin
  mostrarModalImportar = signal(false);
  usuariosCandidatos = signal<UsuarioSuperAdminAsignadoDto[]>([]);
  usuarioSeleccionado = signal<UsuarioSuperAdminAsignadoDto | null>(null);
  importando = signal(false);
  formImportar = { numeroEmpleado: '', turno: '', activo: true };

  // Configuración de la app (para Guardia A/B)
  configuracionApp = signal<ConfiguracionAppResponse | null>(null);
  perfilesOptions = signal<{ id: number; nombre: string }[]>([]);
  mostrarModalGuardiasFijos = signal(false);
  guardiaASeleccionado = signal<number | null>(null);
  guardiaBSeleccionado = signal<number | null>(null);
  guardandoGuardiasFijos = signal(false);

  search$ = toObservable(this.layoutSvc.searchValue);

  constructor() {
    // Efecto para recargar opciones cuando cambien los perfiles
    effect(() => {
      const perfiles = this.perfiles();
      this.perfilesOptions.set(perfiles.map(p => ({ id: p.id, nombre: p.nombreCompleto })));
    });
  }

  ngOnInit(): void {
    this.layoutSvc.setSubheader({
      title: 'Usuarios',
      showSearch: true,
      searchPlaceholder: 'Buscar por nombre...',
      showAddButton: true,
      addButtonLabel: 'Importar usuario',
      addHandler: () => this.abrirModalImportar(),
      actions: [
        {
          label: 'Guardias fijos',
          icon: 'bi-star',
          variant: 'stroked',
          handler: () => this.abrirModalGuardiasFijos()
        },
        {
          label: 'Limpiar',
          icon: 'bi-arrow-counterclockwise',
          variant: 'stroked',
          handler: () => this.layoutSvc.searchValue.set('')
        }
      ]
    });

    // Cargar configuración de la app para tener Guardia A/B
    this.cargarConfiguracionApp();

    this.search$
        .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
        )
        .subscribe(() => {
        this.paginaActual.set(1);
        this.cargarPerfiles();
        });

    this.cargarPerfiles();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.layoutSvc.resetSubheader();
  }

  private async cargarConfiguracionApp(): Promise<void> {
    try {
      const config = await firstValueFrom(this.grService.getConfiguracionApp());
      this.configuracionApp.set(config);
      this.guardiaASeleccionado.set(config.guardiaA_PerfilId);
      this.guardiaBSeleccionado.set(config.guardiaB_PerfilId);
    } catch (error) {
      console.error('Error cargando configuración', error);
    }
  }

  private cargarPerfiles(): void {
    this.cargando.set(true);
    const busqueda = this.layoutSvc.searchValue().trim();
    // Nota: getPerfilesActivos no acepta búsqueda por texto, así que obtenemos todos y filtramos localmente
    this.grService.getPerfilesActivos()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (lista) => {
          let filtrados = lista;
          if (busqueda) {
            const lower = busqueda.toLowerCase();
            filtrados = lista.filter(p => p.nombreCompleto.toLowerCase().includes(lower));
          }
          // Paginación manual
          const inicio = (this.paginaActual() - 1) * this.porPagina;
          const fin = inicio + this.porPagina;
          this.perfiles.set(filtrados.slice(inicio, fin));
          this.totalRegistros.set(filtrados.length);
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.alert.error('No se pudieron cargar los usuarios');
        }
      });
  }

  cambiarPagina(delta: number): void {
    const nueva = this.paginaActual() + delta;
    if (nueva >= 1 && nueva <= this.totalPaginas()) {
      this.paginaActual.set(nueva);
      this.cargarPerfiles();
    }
  }

  // ── Editar perfil ─────────────────────────────────────────────
  editarPerfil(perfil: PerfilSummary): void {
    this.perfilSeleccionado.set(perfil);
    this.formEditar.numeroEmpleado = perfil.numeroEmpleado || '';
    this.formEditar.turno = perfil.turno || '';
    this.formEditar.activo = perfil.activo;
    this.mostrarModalEditar.set(true);
  }

  cerrarModalEditar(): void {
    this.mostrarModalEditar.set(false);
    this.perfilSeleccionado.set(null);
  }

  async guardarEdicion(): Promise<void> {
    const perfil = this.perfilSeleccionado();
    if (!perfil) return;

    this.guardandoEditar.set(true);
    const dto: ActualizarPerfilRequest = {
      nombreCompleto: perfil.nombreCompleto, // no se puede cambiar el nombre desde aquí (viene de SuperAdmin)
      numeroEmpleado: this.formEditar.numeroEmpleado || null,
      turno: this.formEditar.turno || null
    };
    // Primero actualizar datos operativos
    this.grService.actualizarPerfil(perfil.id, dto)
      .pipe(
        switchMap(() => {
          // Si cambiamos el estado activo, lo actualizamos (soft delete)
          if (this.formEditar.activo !== perfil.activo) {
            if (!this.formEditar.activo) {
              return this.grService.desactivarPerfil(perfil.id);
            } else {
              // Nota: no tenemos endpoint para reactivar un perfil directamente, se podría hacer con actualizar pero el activo está en el DTO
              // Por simplicidad, si está activo, solo actualizamos datos.
            //   return this.grService.actualizarPerfil(perfil.id, { ...dto, activo: true });
            }
          }
          return Promise.resolve();
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: () => {
          this.guardandoEditar.set(false);
          this.cerrarModalEditar();
          this.cargarPerfiles();
          this.cargarConfiguracionApp(); // recargar por si afecta guardias fijos
          this.alert.exito('Perfil actualizado');
        },
        error: () => {
          this.guardandoEditar.set(false);
          this.alert.error('No se pudo actualizar el perfil');
        }
      });
  }

  // ── Importar nuevo perfil desde SuperAdmin ───────────────────
  async abrirModalImportar(): Promise<void> {
    this.usuariosCandidatos.set([]);
    this.usuarioSeleccionado.set(null);
    this.formImportar = { numeroEmpleado: '', turno: '', activo: true };
    this.mostrarModalImportar.set(true);
    try {
      const lista = await firstValueFrom(this.grService.getUsuariosAsignados());
      // Solo los que no tienen perfil local (tienePerfilLocal === false)
      this.usuariosCandidatos.set(lista.filter(u => !u.tienePerfilLocal));
    } catch (error) {
      this.alert.error('No se pudieron cargar los usuarios de SuperAdmin');
    }
  }

  onUsuarioSeleccionado(event: any): void {
    const id = +event.target.value;
    const usuario = this.usuariosCandidatos().find(u => u.superAdminUsuarioId === id);
    this.usuarioSeleccionado.set(usuario || null);
  }

  cerrarModalImportar(): void {
    this.mostrarModalImportar.set(false);
    this.usuarioSeleccionado.set(null);
    this.importando.set(false);
  }

  async crearPerfil(): Promise<void> {
    const usuario = this.usuarioSeleccionado();
    if (!usuario) {
      this.alert.error('Selecciona un usuario');
      return;
    }
    this.importando.set(true);
    const request: CrearPerfilRequest = {
      superAdminUsuarioId: usuario.superAdminUsuarioId,
      nombreCompleto: usuario.nombreCompleto,
      numeroEmpleado: this.formImportar.numeroEmpleado || null,
      turno: this.formImportar.turno || null
    };
    this.grService.crearPerfil(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.importando.set(false);
          this.cerrarModalImportar();
          this.cargarPerfiles();
          this.alert.exito('Perfil creado exitosamente');
        },
        error: (err) => {
          this.importando.set(false);
          this.alert.error('No se pudo crear el perfil');
        }
      });
  }

  // ── Guardias fijos (A y B) ───────────────────────────────────
  async abrirModalGuardiasFijos(): Promise<void> {
    // Recargar perfiles para tener lista actualizada
    await this.cargarPerfiles(); // esto carga la lista filtrada, pero necesitamos todos los perfiles activos
    const perfilesActivos = await firstValueFrom(this.grService.getPerfilesActivos());
    this.perfilesOptions.set(perfilesActivos.map(p => ({ id: p.id, nombre: p.nombreCompleto })));
    this.guardiaASeleccionado.set(this.configuracionApp()?.guardiaA_PerfilId ?? null);
    this.guardiaBSeleccionado.set(this.configuracionApp()?.guardiaB_PerfilId ?? null);
    this.mostrarModalGuardiasFijos.set(true);
  }

  cerrarModalGuardiasFijos(): void {
    this.mostrarModalGuardiasFijos.set(false);
  }

  async guardarGuardiasFijos(): Promise<void> {
    this.guardandoGuardiasFijos.set(true);
    const request: UpdateConfiguracionAppRequest = {
      guardiaA_PerfilId: this.guardiaASeleccionado(),
      guardiaB_PerfilId: this.guardiaBSeleccionado()
    };
    this.grService.updateConfiguracionApp(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.guardandoGuardiasFijos.set(false);
          this.cerrarModalGuardiasFijos();
          this.cargarConfiguracionApp();
          this.alert.exito('Guardias fijos actualizados');
        },
        error: () => {
          this.guardandoGuardiasFijos.set(false);
          this.alert.error('No se pudieron actualizar los guardias fijos');
        }
      });
  }

  // Helpers visuales
  getEstadoVariant(activo: boolean): 'green' | 'red' {
    return activo ? 'green' : 'red';
  }

  formatTurno(turno: string | null): string {
    return turno || 'Sin asignar';
  }
}