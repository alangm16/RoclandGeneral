import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, forkJoin, takeUntil } from 'rxjs';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { LayoutService } from '../../../../../core/services/layout.service';
import { TruckCheckService } from '../../../services/truckcheck-services';
import { AlertService } from '../../../../../shared/components/swal-alert/alert.service';
import { ModalComponent } from '../../../../../shared/components/modal/modal.component';
import { BadgeComponent } from '../../../../../shared/components/badge/badge-component';
import { DataTableComponent, DataTableColumn } from '../../../../../shared/components/data-table/data-table.component';
import {
  TipoMantenimiento,
  ProgramaMantenimiento,
  VehiculoResponse,
  CrearTipoMantenimiento,
  ActualizarTipoMantenimiento,
  CrearProgramaMantenimiento,
  ActualizarProgramaMantenimiento
} from '../../../models/truckcheck.models';

@Component({
  selector: 'app-gestion-mantenimiento',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTabsModule,
    MatButtonModule,
    MatMenuModule,
    ModalComponent,
    BadgeComponent,
    DataTableComponent
  ],
  templateUrl: './gestion-mantenimiento.component.html',
  styleUrls: ['./gestion-mantenimiento.component.scss']
})
export class GestionMantenimientoComponent implements OnInit, OnDestroy {
  private layoutSvc = inject(LayoutService);
  private truckSvc = inject(TruckCheckService);
  private fb = inject(FormBuilder);
  private alert = inject(AlertService);
  private destroy$ = new Subject<void>();

  // ── Estados compartidos ──
  cargando = signal(false);

  // ── Tipos ──
  tipos = signal<TipoMantenimiento[]>([]);
  modalTipoAbierto = signal(false);
  editandoTipoId = signal<number | null>(null);
  formTipo: FormGroup;

  columnasTipos: DataTableColumn[] = [
    { key: 'nombre', label: 'NOMBRE' },
    { key: 'activo', label: 'ESTADO' },
    { key: 'acciones', label: '', cellClass: 'text-end' }
  ];

  // ── Programas ──
  programas = signal<ProgramaMantenimiento[]>([]);
  vehiculos = signal<VehiculoResponse[]>([]);
  tiposDisponibles = signal<TipoMantenimiento[]>([]);
  modalProgramaAbierto = signal(false);
  editandoProgramaId = signal<number | null>(null);
  formPrograma: FormGroup;

  columnasProgramas: DataTableColumn[] = [
    { key: 'placas', label: 'VEHÍCULO' },
    { key: 'tipoMantenimiento', label: 'TIPO' },
    { key: 'intervaloKm', label: 'INTERVALO KM' },
    { key: 'intervaloDias', label: 'INTERVALO DÍAS' },
    { key: 'activo', label: 'ESTADO' },
    { key: 'acciones', label: '', cellClass: 'text-end' }
  ];

  constructor() {
    // Formulario de Tipo
    this.formTipo = this.fb.group({
      nombre: ['', Validators.required]
    });

    // Formulario de Programa
    this.formPrograma = this.fb.group({
      idVehiculo: ['', Validators.required],
      idTipoMantenimiento: ['', Validators.required],
      intervaloKm: [null],
      intervaloDias: [null]
    }, { validators: this.alMenosUnIntervalo });
  }

  private alMenosUnIntervalo(group: FormGroup): { [key: string]: boolean } | null {
    const km = group.get('intervaloKm')?.value;
    const dias = group.get('intervaloDias')?.value;
    return (km || dias) ? null : { sinIntervalo: true };
  }

  ngOnInit(): void {
    this.layoutSvc.setSubheader({
      title: 'Gestión de Mantenimiento',
      showSearch: false
    });
    this.cargarTipos();
    this.cargarProgramas();
    this.cargarCatalogosProgramas();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.layoutSvc.resetSubheader();
  }

  // ───────────── TIPOS ─────────────
  cargarTipos(): void {
    this.cargando.set(true);
    this.truckSvc.getTiposMantenimiento(false)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => { this.tipos.set(data); this.cargando.set(false); },
        error: () => { this.cargando.set(false); this.alert.error('Error al cargar tipos'); }
      });
  }

  abrirModalTipo(tipo?: TipoMantenimiento): void {
    this.editandoTipoId.set(tipo?.id ?? null);
    this.formTipo.reset({ nombre: tipo?.nombre ?? '' });
    this.modalTipoAbierto.set(true);
  }

  cerrarModalTipo(): void {
    this.modalTipoAbierto.set(false);
    this.editandoTipoId.set(null);
    this.formTipo.reset();
  }

  async guardarTipo(): Promise<void> {
    if (this.formTipo.invalid) return;
    const nombre = this.formTipo.value.nombre.trim();
    if (!nombre) return;

    const esEdicion = this.editandoTipoId() !== null;
    const confirmado = esEdicion
      ? await this.alert.confirmarEditar(nombre)
      : await this.alert.confirmarAgregar(nombre);
    if (!confirmado) return;

    if (esEdicion) {
      const dto: ActualizarTipoMantenimiento = { Nombre: nombre, Activo: true };
      this.truckSvc.actualizarTipoMantenimiento(this.editandoTipoId()!, dto)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => { this.cargarTipos(); this.cerrarModalTipo(); this.alert.exito('Tipo actualizado'); },
          error: (err) => this.alert.error(err.error?.mensaje || 'Error al actualizar')
        });
    } else {
      const dto: CrearTipoMantenimiento = { nombre: nombre };
      this.truckSvc.crearTipoMantenimiento(dto)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => { this.cargarTipos(); this.cerrarModalTipo(); this.alert.exito('Tipo creado'); },
          error: (err) => this.alert.error(err.error?.mensaje || 'Error al crear')
        });
    }
  }

  async toggleTipo(tipo: TipoMantenimiento): Promise<void> {
    const accion = tipo.activo ? 'desactivar' : 'activar';
    const confirmado = await this.alert.confirmar({
      titulo: `${tipo.activo ? 'Desactivar' : 'Activar'} tipo`,
      texto: `¿${accion} el tipo "${tipo.nombre}"?`,
      labelConfirmar: `Sí, ${accion}`,
      labelCancelar: 'Cancelar'
    });
    if (!confirmado) return;
    const dto: ActualizarTipoMantenimiento = { Nombre: tipo.nombre, Activo: !tipo.activo };
    this.truckSvc.actualizarTipoMantenimiento(tipo.id, dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.cargarTipos(),
        error: (err) => this.alert.error(err.error?.mensaje || `No se pudo ${accion}`)
      });
  }

  // ───────────── PROGRAMAS ─────────────
  cargarProgramas(): void {
    this.cargando.set(true);
    this.truckSvc.getProgramasMantenimiento(false)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => { this.programas.set(data); this.cargando.set(false); },
        error: () => { this.cargando.set(false); this.alert.error('Error al cargar programas'); }
      });
  }

  cargarCatalogosProgramas(): void {
    forkJoin({
      vehiculos: this.truckSvc.getVehiculos(),
      tipos: this.truckSvc.getTiposMantenimiento(true) // solo activos para el select
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ vehiculos, tipos }) => {
          this.vehiculos.set(vehiculos);
          this.tiposDisponibles.set(tipos);
        },
        error: () => this.alert.error('Error al cargar catálogos para programas')
      });
  }

  abrirModalPrograma(programa?: ProgramaMantenimiento): void {
    this.editandoProgramaId.set(programa?.Id ?? null);
    this.formPrograma.reset({
      idVehiculo: programa?.IdVehiculo ?? '',
      idTipoMantenimiento: programa?.IdTipoMantenimiento ?? '',
      intervaloKm: programa?.IntervaloKm ?? null,
      intervaloDias: programa?.IntervaloDias ?? null
    });
    this.modalProgramaAbierto.set(true);
  }

  cerrarModalPrograma(): void {
    this.modalProgramaAbierto.set(false);
    this.editandoProgramaId.set(null);
    this.formPrograma.reset();
  }

  async guardarPrograma(): Promise<void> {
    if (this.formPrograma.invalid) {
      this.alert.advertencia('Debe especificar al menos un intervalo (km o días).');
      return;
    }
    const valores = this.formPrograma.value;
    const esEdicion = this.editandoProgramaId() !== null;
    const confirmado = esEdicion
      ? await this.alert.confirmarEditar('el programa')
      : await this.alert.confirmarAgregar('el programa');
    if (!confirmado) return;

    if (esEdicion) {
      const dto: ActualizarProgramaMantenimiento = {
        IntervaloKm: valores.intervaloKm || null,
        IntervaloDias: valores.intervaloDias || null,
        Activo: true
      };
      this.truckSvc.actualizarProgramaMantenimiento(this.editandoProgramaId()!, dto)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => { this.cargarProgramas(); this.cerrarModalPrograma(); this.alert.exito('Programa actualizado'); },
          error: (err) => this.alert.error(err.error?.mensaje || 'Error al actualizar')
        });
    } else {
      const dto: CrearProgramaMantenimiento = {
        IdVehiculo: +valores.idVehiculo,
        IdTipoMantenimiento: +valores.idTipoMantenimiento,
        IntervaloKm: valores.intervaloKm || null,
        IntervaloDias: valores.intervaloDias || null
      };
      this.truckSvc.crearProgramaMantenimiento(dto)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => { this.cargarProgramas(); this.cerrarModalPrograma(); this.alert.exito('Programa creado'); },
          error: (err) => this.alert.error(err.error?.mensaje || 'Error al crear')
        });
    }
  }

  async togglePrograma(programa: ProgramaMantenimiento): Promise<void> {
    const accion = programa.Activo ? 'desactivar' : 'activar';
    const confirmado = await this.alert.confirmar({
      titulo: `${programa.Activo ? 'Desactivar' : 'Activar'} programa`,
      texto: `¿${accion} el programa para ${programa.Placas} - ${programa.TipoMantenimiento}?`,
      labelConfirmar: `Sí, ${accion}`,
      labelCancelar: 'Cancelar'
    });
    if (!confirmado) return;
    const dto: ActualizarProgramaMantenimiento = {
      IntervaloKm: programa.IntervaloKm || null,
      IntervaloDias: programa.IntervaloDias || null,
      Activo: !programa.Activo
    };
    this.truckSvc.actualizarProgramaMantenimiento(programa.Id, dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.cargarProgramas(),
        error: (err) => this.alert.error(err.error?.mensaje || `No se pudo ${accion}`)
      });
  }
}