import { Component, OnInit, OnDestroy, inject, signal, computed, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, firstValueFrom, forkJoin } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';
import { MatTabsModule } from '@angular/material/tabs';
import { MatMenuModule } from '@angular/material/menu';
import { CdkDragDrop, moveItemInArray, DragDropModule } from '@angular/cdk/drag-drop';
import { LayoutService } from '../../../../../core/services/layout.service';
import { GuardiaRelevoService } from '../../../services/guardia-relevo.service';
import { AlertService } from '../../../../../shared/components/swal-alert/alert.service';
import { DataTableComponent, DataTableColumn } from '../../../../../shared/components/data-table/data-table.component';
import { ModalComponent } from '../../../../../shared/components/modal/modal.component';
import { BadgeComponent } from '../../../../../shared/components/badge/badge-component';
import {
  ConfigTurnoSummary,
  ActualizarConfigTurnoRequest,
  ChecklistPuntoResponse,
  CrearChecklistPuntoRequest,
  ActualizarChecklistPuntoRequest,
  ReordenarChecklistPuntosRequest,
  PerfilSummary,
  AsignacionBaseSummary,
  CrearAsignacionBaseRequest,
  ActualizarAsignacionBaseRequest,
  ConfiguracionAppResponse,
  UpdateConfiguracionAppRequest,
  InfoModoResponse,
} from '../../../models/guardia-relevo.models';

@Component({
  selector: 'app-guardia-relevo-configuracion',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatTabsModule,
    MatMenuModule,
    DragDropModule,
    DataTableComponent,
    ModalComponent,
    BadgeComponent,
  ],
  templateUrl: './configuracion.component.html',
  styleUrls: ['./configuracion.component.scss'],
})
export class ConfiguracionComponent implements OnInit, OnDestroy {
  private layoutSvc = inject(LayoutService);
  private grService = inject(GuardiaRelevoService);
  private alert = inject(AlertService);
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();

  // Estado de carga global
  cargando = signal(false);
  // Para sección de diagnóstico
  infoModo = signal<InfoModoResponse | null>(null);

  // ──────────────────────────────────────────────────────────────
  // 3.1 TURNOS (Diurno y Nocturno)
  // ──────────────────────────────────────────────────────────────
  turnoDiurno = signal<ConfigTurnoSummary | null>(null);
  turnoNocturno = signal<ConfigTurnoSummary | null>(null);
  editandoTurno = signal<ConfigTurnoSummary | null>(null);
  turnoForm: FormGroup;

  // ──────────────────────────────────────────────────────────────
  // 3.2 CHECKLIST
  // ──────────────────────────────────────────────────────────────
  puntos = signal<ChecklistPuntoResponse[]>([]);
  columnasPuntos: DataTableColumn[] = [
    { key: 'categoria', label: 'CATEGORÍA' },
    { key: 'nombre', label: 'NOMBRE' },
    { key: 'descripcion', label: 'DESCRIPCIÓN' },
    { key: 'orden', label: 'ORDEN', cellClass: 'text-center' },
    { key: 'activo', label: 'ESTADO', cellClass: 'text-center' },
    { key: 'acciones', label: '', cellClass: 'text-end' },
  ];
  modalPuntoAbierto = signal(false);
  editandoPuntoId = signal<number | null>(null);
  puntoForm: FormGroup;

  // ──────────────────────────────────────────────────────────────
  // 3.3 ASIGNACIONES BASE
  // ──────────────────────────────────────────────────────────────
  asignaciones = signal<AsignacionBaseSummary[]>([]);
  columnasAsignaciones: DataTableColumn[] = [
    { key: 'turnoNombre', label: 'TURNO' },
    { key: 'rol', label: 'ROL' },
    { key: 'guardiaNombre', label: 'GUARDIA' },
    { key: 'fechaVigenciaDesde', label: 'VIGENCIA DESDE', cellClass: 'text-center' },
    { key: 'fechaVigenciaHasta', label: 'VIGENCIA HASTA', cellClass: 'text-center' },
    { key: 'activo', label: 'ESTADO', cellClass: 'text-center' },
    { key: 'acciones', label: '', cellClass: 'text-end' },
  ];
  modalAsignacionAbierto = signal(false);
  editandoAsignacionId = signal<number | null>(null);
  asignacionForm: FormGroup;
  turnosOptions = signal<{ label: string; value: number }[]>([]);
  perfilesOptions = signal<{ label: string; value: number }[]>([]);

  // ──────────────────────────────────────────────────────────────
  // 3.4 CONFIGURACIÓN GENERAL DE LA APP
  // ──────────────────────────────────────────────────────────────
  configApp = signal<ConfiguracionAppResponse | null>(null);
  configForm: FormGroup;
  perfilesActivos = signal<PerfilSummary[]>([]);
  mostrarDiagnostico = signal(false);

  constructor() {
    // Formulario para editar turno (horas reales y prueba)
    this.turnoForm = this.fb.group({
      horaInicioSaliente: ['', Validators.required],
      horaFinSaliente: ['', Validators.required],
      horaInicioEntrante: ['', Validators.required],
      horaFinEntrante: ['', Validators.required],
      horaInicioSalientePrueba: [''],
      horaFinSalientePrueba: [''],
      horaInicioEntrantePrueba: [''],
      horaFinEntrantePrueba: [''],
    });

    this.puntoForm = this.fb.group({
      categoria: ['', Validators.required],
      nombre: ['', Validators.required],
      descripcion: [''],
      orden: [0, Validators.required],
    });

    this.asignacionForm = this.fb.group({
      configTurnoId: [null, Validators.required],
      rol: ['Saliente', Validators.required],
      perfilId: [null, Validators.required],
      fechaVigenciaDesde: ['', Validators.required],
      fechaVigenciaHasta: [''],
    });

    this.configForm = this.fb.group({
      modoActivo: ['Produccion', Validators.required],
      soloLunesViernes: [true],
      guardiaA_PerfilId: [null],
      guardiaB_PerfilId: [null],
    });
  }

  ngOnInit(): void {
    this.layoutSvc.setSubheader({ title: 'Configuración', showSearch: false });
    this.cargarTurnos();
    this.cargarPuntos();
    this.cargarAsignaciones();
    this.cargarOpcionesParaAsignacion();
    this.cargarConfiguracionApp();
    this.cargarPerfilesActivos();
    this.cargarInfoModo();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.layoutSvc.resetSubheader();
  }

  // ──────────────────────────────────────────────────────────────
  // 3.1 TURNOS
  // ──────────────────────────────────────────────────────────────
  cargarTurnos(): void {
    this.cargando.set(true);
    this.grService.getConfigTurnosActivos()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (turnos) => {
          this.turnoDiurno.set(turnos.find(t => t.nombre === 'Diurno') || null);
          this.turnoNocturno.set(turnos.find(t => t.nombre === 'Nocturno') || null);
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.alert.error('No se pudieron cargar los turnos');
        }
      });
  }

  editarTurno(turno: ConfigTurnoSummary): void {
    this.editandoTurno.set(turno);
    this.turnoForm.patchValue({
      horaInicioSaliente: turno.horaInicioSaliente.substring(0,5),
      horaFinSaliente: turno.horaFinSaliente.substring(0,5),
      horaInicioEntrante: turno.horaInicioEntrante.substring(0,5),
      horaFinEntrante: turno.horaFinEntrante.substring(0,5),
      horaInicioSalientePrueba: turno.horaInicioSalientePrueba?.substring(0,5) || '',
      horaFinSalientePrueba: turno.horaFinSalientePrueba?.substring(0,5) || '',
      horaInicioEntrantePrueba: turno.horaInicioEntrantePrueba?.substring(0,5) || '',
      horaFinEntrantePrueba: turno.horaFinEntrantePrueba?.substring(0,5) || '',
    });
  }

  async guardarTurno(): Promise<void> {
    if (this.turnoForm.invalid) return;
    const turno = this.editandoTurno();
    if (!turno) return;

    const confirmado = await this.alert.confirmarEditar(turno.nombre);
    if (!confirmado) return;

    const dto: ActualizarConfigTurnoRequest = {
      nombre: turno.nombre,
      horaInicioSaliente: this.turnoForm.value.horaInicioSaliente + ':00',
      horaFinSaliente: this.turnoForm.value.horaFinSaliente + ':00',
      horaInicioEntrante: this.turnoForm.value.horaInicioEntrante + ':00',
      horaFinEntrante: this.turnoForm.value.horaFinEntrante + ':00',
    };
    // Para actualizar también las horas de prueba, necesitaríamos otro endpoint o enviar todo junto.
    // Como el endpoint actual solo actualiza las reales, llamamos a actualizarConfigTurno.
    // Las horas de prueba se guardarán por separado si existiera un método específico.
    // Por simplicidad, aquí solo actualizamos las reales. Las de prueba se pueden editar en otro momento.
    this.grService.actualizarConfigTurno(turno.id, dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.cargarTurnos();
          this.alert.exito(`Turno ${turno.nombre} actualizado`);
        },
        error: () => this.alert.error('No se pudo actualizar el turno')
      });
  }

  // ──────────────────────────────────────────────────────────────
  // 3.2 CHECKLIST
  // ──────────────────────────────────────────────────────────────
  cargarPuntos(): void {
    this.cargando.set(true);
    this.grService.getChecklistPuntosActivos()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => { this.puntos.set(data); this.cargando.set(false); },
        error: () => { this.cargando.set(false); this.alert.error('No se pudieron cargar los puntos'); }
      });
  }

  abrirModalPunto(punto?: ChecklistPuntoResponse): void {
    this.puntoForm.reset({ categoria: '', nombre: '', descripcion: '', orden: 0 });
    if (punto) {
      this.editandoPuntoId.set(punto.id);
      this.puntoForm.patchValue({
        categoria: punto.categoria,
        nombre: punto.nombre,
        descripcion: punto.descripcion,
        orden: punto.orden,
      });
    } else {
      this.editandoPuntoId.set(null);
    }
    this.modalPuntoAbierto.set(true);
  }

  async guardarPunto(): Promise<void> {
    if (this.puntoForm.invalid) return;
    const nombre = this.puntoForm.value.nombre;
    const confirmado = this.editandoPuntoId()
      ? await this.alert.confirmarEditar(nombre)
      : await this.alert.confirmarAgregar(nombre);
    if (!confirmado) return;

    const dto = this.puntoForm.value as CrearChecklistPuntoRequest;
    if (this.editandoPuntoId()) {
      const actualizarDto: ActualizarChecklistPuntoRequest = { ...dto, activo: true };
      this.grService.actualizarChecklistPunto(this.editandoPuntoId()!, actualizarDto)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => { this.cargarPuntos(); this.modalPuntoAbierto.set(false); this.alert.exito('Punto actualizado'); },
          error: () => this.alert.error('No se pudo actualizar el punto'),
        });
    } else {
      this.grService.crearChecklistPunto(dto)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => { this.cargarPuntos(); this.modalPuntoAbierto.set(false); this.alert.exito('Punto creado'); },
          error: () => this.alert.error('No se pudo crear el punto'),
        });
    }
  }

  async desactivarPunto(punto: ChecklistPuntoResponse): Promise<void> {
    const confirmado = await this.alert.confirmar({
      titulo: 'Desactivar punto',
      texto: `¿Seguro que deseas desactivar el punto "${punto.nombre}"?`,
      labelConfirmar: 'Sí, desactivar',
    });
    if (!confirmado) return;
    this.grService.desactivarChecklistPunto(punto.id).subscribe({
      next: () => { this.cargarPuntos(); this.alert.exito('Punto desactivado'); },
      error: () => this.alert.error('No se pudo desactivar el punto'),
    });
  }

  // Reordenamiento
  dropPunto(event: CdkDragDrop<ChecklistPuntoResponse[]>): void {
    const puntos = [...this.puntos()];
    moveItemInArray(puntos, event.previousIndex, event.currentIndex);
    // Actualizar orden en el backend
    const items = puntos.map((p, idx) => ({ id: p.id, orden: idx + 1 }));
    const request: ReordenarChecklistPuntosRequest = { items };
    this.grService.reordenarChecklistPuntos(request).subscribe({
      next: () => { this.puntos.set(puntos); this.alert.exito('Orden actualizado'); },
      error: () => this.alert.error('No se pudo reordenar'),
    });
  }

  // ──────────────────────────────────────────────────────────────
  // 3.3 ASIGNACIONES BASE
  // ──────────────────────────────────────────────────────────────
  cargarAsignaciones(): void {
    this.grService.getAsignacionesVigentes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => this.asignaciones.set(data),
        error: () => this.alert.error('No se pudieron cargar las asignaciones')
      });
  }

  cargarOpcionesParaAsignacion(): void {
    this.grService.getConfigTurnosActivos().subscribe(turnos => {
      this.turnosOptions.set(turnos.map(t => ({ label: t.nombre, value: t.id })));
    });
    this.grService.getPerfilesActivos().subscribe(perfiles => {
      this.perfilesOptions.set(perfiles.map(p => ({ label: p.nombreCompleto, value: p.id })));
    });
  }

  abrirModalAsignacion(asignacion?: AsignacionBaseSummary): void {
    this.asignacionForm.reset({ configTurnoId: null, rol: 'Saliente', perfilId: null, fechaVigenciaDesde: '', fechaVigenciaHasta: '' });
    if (asignacion) {
      this.editandoAsignacionId.set(asignacion.id);
      this.grService.getAsignacionBase(asignacion.id).subscribe(detalle => {
        this.asignacionForm.patchValue({
          configTurnoId: detalle.configTurnoId,
          rol: detalle.rol,
          perfilId: detalle.perfilId,
          fechaVigenciaDesde: detalle.fechaVigenciaDesde,
          fechaVigenciaHasta: detalle.fechaVigenciaHasta,
        });
      });
    } else {
      this.editandoAsignacionId.set(null);
    }
    this.modalAsignacionAbierto.set(true);
  }

  async guardarAsignacion(): Promise<void> {
    if (this.asignacionForm.invalid) return;
    const guardiaNombre = this.perfilesOptions().find(p => p.value === this.asignacionForm.value.perfilId)?.label || 'guardia';
    const confirmado = this.editandoAsignacionId()
      ? await this.alert.confirmarEditar(guardiaNombre)
      : await this.alert.confirmarAgregar(guardiaNombre);
    if (!confirmado) return;

    const dto: CrearAsignacionBaseRequest = this.asignacionForm.value;
    if (this.editandoAsignacionId()) {
      const actualizarDto: ActualizarAsignacionBaseRequest = { ...dto, activo: true };
      this.grService.actualizarAsignacionBase(this.editandoAsignacionId()!, actualizarDto)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => { this.cargarAsignaciones(); this.modalAsignacionAbierto.set(false); this.alert.exito('Asignación actualizada'); },
          error: () => this.alert.error('No se pudo actualizar la asignación'),
        });
    } else {
      this.grService.crearAsignacionBase(dto)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => { this.cargarAsignaciones(); this.modalAsignacionAbierto.set(false); this.alert.exito('Asignación creada'); },
          error: () => this.alert.error('No se pudo crear la asignación'),
        });
    }
  }

  async desactivarAsignacion(asignacion: AsignacionBaseSummary): Promise<void> {
    const confirmado = await this.alert.confirmar({
      titulo: 'Desactivar asignación',
      texto: `¿Seguro que deseas desactivar la asignación de ${asignacion.guardiaNombre} como ${asignacion.rol} en ${asignacion.turnoNombre}?`,
      labelConfirmar: 'Sí, desactivar',
    });
    if (!confirmado) return;
    this.grService.desactivarAsignacionBase(asignacion.id).subscribe({
      next: () => { this.cargarAsignaciones(); this.alert.exito('Asignación desactivada'); },
      error: () => this.alert.error('No se pudo desactivar la asignación'),
    });
  }

  // ──────────────────────────────────────────────────────────────
  // 3.4 CONFIGURACIÓN GENERAL DE LA APP
  // ──────────────────────────────────────────────────────────────
  cargarConfiguracionApp(): void {
    this.grService.getConfiguracionApp()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (config) => {
          this.configApp.set(config);
          this.configForm.patchValue({
            modoActivo: config.modoActivo,
            soloLunesViernes: config.soloLunesViernes,
            guardiaA_PerfilId: config.guardiaA_PerfilId,
            guardiaB_PerfilId: config.guardiaB_PerfilId,
          });
        },
        error: () => this.alert.error('No se pudo cargar la configuración de la app')
      });
  }

  cargarPerfilesActivos(): void {
    this.grService.getPerfilesActivos()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (perfiles) => this.perfilesActivos.set(perfiles),
        error: () => this.alert.error('No se pudieron cargar los perfiles')
      });
  }

  cargarInfoModo(): void {
    this.grService.getInfoModo()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (info) => this.infoModo.set(info),
        error: () => console.error('Error cargando info modo')
      });
  }

  async guardarConfiguracionApp(): Promise<void> {
    if (this.configForm.invalid) return;
    const request: UpdateConfiguracionAppRequest = {
      modoActivo: this.configForm.value.modoActivo,
      soloLunesViernes: this.configForm.value.soloLunesViernes,
      guardiaA_PerfilId: this.configForm.value.guardiaA_PerfilId || null,
      guardiaB_PerfilId: this.configForm.value.guardiaB_PerfilId || null,
    };
    const confirmado = await this.alert.confirmarEditar('configuración general');
    if (!confirmado) return;
    this.grService.updateConfiguracionApp(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.alert.exito('Configuración guardada');
          this.cargarConfiguracionApp();
          this.cargarInfoModo();
        },
        error: () => this.alert.error('No se pudo guardar la configuración')
      });
  }

  // Helpers
  getEstadoVariant(activo: boolean): 'green' | 'red' {
    return activo ? 'green' : 'red';
  }
  formatHora(hora: string): string {
    return hora?.substring(0,5) || '';
  }
}