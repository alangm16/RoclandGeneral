import { Component, OnInit, OnDestroy, inject, signal, computed, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { LayoutService } from '../../../../../core/services/layout.service';
import { SuperadminService } from '../../../services/super-admin.service';
import { AuthService } from '../../../../../core/auth/auth.service';
import { AlertService } from '../../../../../shared/components/swal-alert/alert.service';
import { DataTableComponent, DataTableColumn } from '../../../../../shared/components/data-table/data-table.component';
import { BadgeComponent } from '../../../../../shared/components/badge/badge-component';

import {
  ProyectoListDto,
  UsuarioProyectoDto,
  VistaAccesoUsuarioDto,
  PagedResult
} from '../../../models/superadmin.models';

@Component({
  selector: 'app-vistas-usuario',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './vistas-usuario.component.html',
  styleUrls: ['./vistas-usuario.component.scss']
})
export class VistasUsuarioComponent implements OnInit, OnDestroy {
  private layoutSvc = inject(LayoutService);
  private saSvc = inject(SuperadminService);
  private alert = inject(AlertService);
  private authSvc = inject(AuthService);
  private injector = inject(Injector);
  private destroy$ = new Subject<void>();

  // ── Permisos ─────────────────────────
  puedeAdministrar = computed(() => {
    const rol = this.authSvc.proyectoActivo()?.rolEnProyecto;
    return rol === 'SuperAdmin' || rol === 'Admin';
  });

  // ── Estado ───────────────────────────
  proyectos = signal<ProyectoListDto[]>([]);
  proyectoSeleccionado = signal<ProyectoListDto | null>(null);

  usuariosProyecto = signal<UsuarioProyectoDto[]>([]);
  usuarioSeleccionado = signal<UsuarioProyectoDto | null>(null);
  cargandoUsuarios = signal(false);

  vistas = signal<VistaAccesoUsuarioDto[]>([]);
  cargandoVistas = signal(false);
  actualizando = signal<number | null>(null); // vistaId que se está actualizando

  // ── Columnas tabla ───────────────────
  columnas: DataTableColumn[] = [
    { key: 'codigo', label: 'CÓDIGO' },
    { key: 'nombre', label: 'NOMBRE' },
    { key: 'ruta', label: 'RUTA' },
    { key: 'orden', label: 'ORDEN', cellClass: 'text-center' },
    { key: 'tieneAcceso', label: 'VISIBLE EN SIDEBAR', cellClass: 'text-center' }
  ];

  constructor() {}

  ngOnInit(): void {
    // Configurar subheader con selector de proyecto
    this.configurarSubheader();

    // Cargar proyectos
    this.cargarProyectos();

    // Reaccionar a cambios en el filtro de proyecto
    toObservable(this.layoutSvc.filterValues, { injector: this.injector }).pipe(
      debounceTime(300),
      distinctUntilChanged((prev, curr) => prev['proyectoId'] === curr['proyectoId']),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      const proyectoId = this.layoutSvc.filterValues()['proyectoId'];
      if (proyectoId) {
        const id = +proyectoId;
        const proyecto = this.proyectos().find(p => p.id === id) || null;
        this.proyectoSeleccionado.set(proyecto);
        this.cargarUsuariosDelProyecto(id);
      } else {
        this.proyectoSeleccionado.set(null);
        this.usuariosProyecto.set([]);
        this.usuarioSeleccionado.set(null);
        this.vistas.set([]);
      }
    });

    // Reaccionar a selección de usuario (desde el select del template)
    // Usamos un signal que se actualiza manualmente
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.layoutSvc.resetSubheader();
  }

  // ── Configuración del subheader ───────
  private configurarSubheader(): void {
    this.layoutSvc.setSubheader({
      title: 'Visibilidad de Vistas',
      showSearch: false,
      filters: [
        {
          type: 'select',
          key: 'proyectoId',
          placeholder: 'Seleccionar proyecto...',
          options: []
        }
      ],
      actions: [
        {
          label: 'Limpiar filtros',
          icon: 'bi-arrow-counterclockwise',
          variant: 'stroked',
          handler: () => this.limpiarFiltros()
        }
      ]
    });
  }

  private cargarProyectos(): void {
    this.saSvc.getProyectos()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (proyectos) => {
          this.proyectos.set(proyectos);
          this.actualizarOpcionesProyecto(proyectos);
        },
        error: () => this.alert.error('No se pudieron cargar los proyectos')
      });
  }

  private actualizarOpcionesProyecto(proyectos: ProyectoListDto[]): void {
    const options = proyectos.map(p => ({
      label: `${p.nombre} (${p.codigo})`,
      value: p.id.toString()
    }));
    const currentFilters = this.layoutSvc.subheaderFilters();
    const idx = currentFilters.findIndex(f => f.key === 'proyectoId');
    if (idx !== -1) {
      const updated = [...currentFilters];
      updated[idx] = { ...updated[idx], options };
      this.layoutSvc.subheaderFilters.set(updated);
    }
  }

  private cargarUsuariosDelProyecto(proyectoId: number): void {
    this.cargandoUsuarios.set(true);
    this.usuariosProyecto.set([]);
    this.usuarioSeleccionado.set(null);
    this.vistas.set([]);

    // Obtener todos los usuarios asignados al proyecto (paginación amplia)
    this.saSvc.getUsuariosPorProyecto(proyectoId, 1, 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result: PagedResult<UsuarioProyectoDto>) => {
          this.usuariosProyecto.set(result.items);
          this.cargandoUsuarios.set(false);
          // Si hay usuarios, seleccionar el primero automáticamente (opcional)
          if (result.items.length > 0) {
            this.onUsuarioChange(result.items[0]);
          }
        },
        error: () => {
          this.cargandoUsuarios.set(false);
          this.alert.error('Error al cargar los usuarios del proyecto');
        }
      });
  }

  // Se llama desde el template al seleccionar un usuario
  onUsuarioChange(usuario: UsuarioProyectoDto | null): void {
    this.usuarioSeleccionado.set(usuario);
    if (usuario && this.proyectoSeleccionado()) {
      this.cargarVistasAcceso(usuario.usuarioId, this.proyectoSeleccionado()!.id);
    } else {
      this.vistas.set([]);
    }
  }

  private cargarVistasAcceso(usuarioId: number, proyectoId: number): void {
    this.cargandoVistas.set(true);
    this.saSvc.getVistasAcceso(usuarioId, proyectoId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (vistas) => {
          // Ordenar por orden ascendente
          const sorted = [...vistas].sort((a, b) => a.orden - b.orden);
          this.vistas.set(sorted);
          this.cargandoVistas.set(false);
        },
        error: () => {
          this.cargandoVistas.set(false);
          this.alert.error('Error al cargar las vistas del proyecto');
        }
      });
  }

  async toggleAcceso(vista: VistaAccesoUsuarioDto): Promise<void> {
    if (!this.puedeAdministrar()) return;
    const usuario = this.usuarioSeleccionado();
    if (!usuario) return;

    const nuevoEstado = !vista.tieneAcceso;
    const accion = nuevoEstado ? 'mostrar' : 'ocultar';
    const confirmado = await this.alert.confirmar({
      titulo: `${nuevoEstado ? 'Mostrar' : 'Ocultar'} vista`,
      texto: `¿Desea ${accion} la vista "${vista.nombre}" en el sidebar del usuario ${usuario.nombreCompleto}?`,
      labelConfirmar: `Sí, ${accion}`,
      labelCancelar: 'Cancelar'
    });
    if (!confirmado) return;

    this.actualizando.set(vista.vistaId);
    this.saSvc.actualizarVistaAcceso(usuario.usuarioId, vista.vistaId, nuevoEstado)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Actualizar localmente
          this.vistas.update(vistas =>
            vistas.map(v =>
              v.vistaId === vista.vistaId ? { ...v, tieneAcceso: nuevoEstado } : v
            )
          );
          this.actualizando.set(null);
          this.alert.exito(`La vista "${vista.nombre}" ahora está ${nuevoEstado ? 'visible' : 'oculta'}.`);
        },
        error: () => {
          this.actualizando.set(null);
          this.alert.error(`No se pudo cambiar la visibilidad de la vista.`);
        }
      });
  }

  limpiarFiltros(): void {
    this.layoutSvc.filterValues.update(() => ({}));
    this.usuarioSeleccionado.set(null);
    this.vistas.set([]);
  }
}