import {
  Component, OnInit, OnDestroy, inject, signal, computed,
  Injector
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, combineLatest, firstValueFrom } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';
import { LayoutService } from '../../../../../core/services/layout.service';
import { GuardiaRelevoService } from '../../../services/guardia-relevo.service';
import { AlertService } from '../../../../../shared/components/swal-alert/alert.service';
import { DataTableComponent, DataTableColumn } from '../../../../../shared/components/data-table/data-table.component';
import { BadgeComponent } from '../../../../../shared/components/badge/badge-component';
import { ModalComponent } from '../../../../../shared/components/modal/modal.component';
import { MatMenuModule } from '@angular/material/menu';
import { MatDivider } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { AuthService } from '../../../../../core/auth/auth.service';
import {
  RelevoListResponse,
  RelevoDetalleResponse,
  RelevoHoyResponse,
  FiltrarRelevosRequest,
  ActualizarEstadoRelevoRequest,
  AsignarParticipanteRequest,
  CrearRelevoRequest,
} from '../../../models/guardia-relevo.models';

@Component({
  selector: 'app-guardia-relevo-relevos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DataTableComponent,
    BadgeComponent,
    ModalComponent,
    MatMenuModule,
    MatDivider,
    MatTabsModule,
  ],
  templateUrl: './relevos.component.html',
  styleUrls: ['./relevos.component.scss'],
})
export class RelevosComponent implements OnInit, OnDestroy {
  private layoutSvc = inject(LayoutService);
  private grService = inject(GuardiaRelevoService);
  private alert = inject(AlertService);
  private injector = inject(Injector);
  private destroy$ = new Subject<void>();
  private authSvc = inject(AuthService);

  // Fecha seleccionada para las tarjetas del día
  fechaSeleccionada = signal<string>(new Date().toISOString().split('T')[0]);

  // Opciones de fecha rápida
  fechasRapidas = [
    { label: 'Hoy', value: () => new Date().toISOString().split('T')[0] },
    { label: 'Ayer', value: () => new Date(Date.now() - 86400000).toISOString().split('T')[0] },
    { label: 'Esta semana', value: () => new Date().toISOString().split('T')[0] }, // no cambia, solo refresca
  ];

  // Relevos del día (tarjetas)
  relevoDiurno = signal<RelevoHoyResponse | null>(null);
  relevoNocturno = signal<RelevoHoyResponse | null>(null);
  cargandoTarjetas = signal(false);

  // Tabla de historial
  relevos = signal<RelevoListResponse[]>([]);
  totalRegistros = signal(0);
  cargandoTabla = signal(false);
  paginaActual = signal(1);
  readonly porPagina = 15;
  totalPaginas = computed(() => Math.max(1, Math.ceil(this.totalRegistros() / this.porPagina)));

  // Columnas de la tabla
  columnas: DataTableColumn[] = [
    { key: 'fecha', label: 'FECHA', cellClass: 'text-mono' },
    { key: 'nombreTurno', label: 'TURNO' },
    { key: 'nombreSaliente', label: 'SALIENTE' },
    { key: 'nombreEntrante', label: 'ENTRANTE' },
    { key: 'estado', label: 'ESTADO', cellClass: 'text-center' },
    { key: 'totalIncidenciasAbiertas', label: 'INC. ABIERTAS', cellClass: 'text-center' },
    { key: 'acciones', label: '', cellClass: 'text-end' },
  ];

  // Opciones para filtros
  turnosOptions = signal<{ label: string; value: string }[]>([]);

  // Modal de detalle
  modalAbierto = signal(false);
  relevoDetalle = signal<RelevoDetalleResponse | null>(null);
  cargandoDetalle = signal(false);

  // Modal cambiar estado
  modalEstadoAbierto = signal(false);
  estadoSeleccionado = signal('');
  relevoIdParaEstado = signal<number | null>(null);

  // Modal asignar guardia
  modalAsignacionAbierto = signal(false);
  asignacionRelevoId = signal<number | null>(null);
  asignacionRol = signal<'Saliente' | 'Entrante'>('Saliente');
  asignacionPerfilId = signal<number | null>(null);
  perfilesDisponibles = signal<{ id: number; nombre: string }[]>([]);

  // Modal crear relevo manual
  modalCrearRelevoAbierto = signal(false);
  nuevoRelevoTurnoId = signal<number | null>(null);
  nuevoRelevoFecha = signal<string>(new Date().toISOString().split('T')[0]);

  constructor() {
    // Configurar suscripción a filtros y búsqueda en el constructor (contexto de inyección válido)
    combineLatest([
      toObservable(this.layoutSvc.searchValue, { injector: this.injector }),
      toObservable(this.layoutSvc.filterValues, { injector: this.injector })
    ])
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.paginaActual.set(1);
        this.cargarTabla();
      });
  }

  ngOnInit(): void {
    this.layoutSvc.setSubheader({
      title: 'Relevos',
      showSearch: true,
      searchPlaceholder: 'Buscar por guardia o turno...',
      filters: [
        { type: 'date', key: 'fechaDesde', placeholder: 'Fecha desde' },
        { type: 'date', key: 'fechaHasta', placeholder: 'Fecha hasta' },
        { type: 'select', key: 'configTurnoId', placeholder: 'Todos los turnos', options: [] },
        {
          type: 'select', key: 'estado', placeholder: 'Todos los estados',
          options: [
            { label: 'Pendiente', value: 'Pendiente' },
            { label: 'EnCurso', value: 'EnCurso' },
            { label: 'Completado', value: 'Completado' },
            { label: 'Incompleto', value: 'Incompleto' }
          ]
        }
      ],
      actions: [
        { label: 'Buscar', icon: 'bi-search', variant: 'flat', handler: () => this.ejecutarBusqueda() },
        { label: 'Limpiar', icon: 'bi-arrow-counterclockwise', variant: 'stroked', handler: () => this.limpiarFiltros() }
      ]
    });

    this.cargarOpcionesTurnos();
    this.cargarTarjetas();          // Carga inicial de tarjetas del día actual
    this.cargarTabla();             // Carga inicial de la tabla
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.layoutSvc.resetSubheader();
  }

  // ──────────────────────────────────────────────────────────────
  //  FECHA RÁPIDA
  // ──────────────────────────────────────────────────────────────
  setFechaRapida(tipo: string): void {
    let nuevaFecha = '';
    if (tipo === 'hoy') {
      nuevaFecha = new Date().toISOString().split('T')[0];
    } else if (tipo === 'ayer') {
      nuevaFecha = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    } else if (tipo === 'semana') {
      // No cambia la fecha, solo refresca las tarjetas con la fecha actual
      this.cargarTarjetas();
      return;
    }
    this.fechaSeleccionada.set(nuevaFecha);
    this.cargarTarjetas(); // recargar con la nueva fecha
  }

  // ──────────────────────────────────────────────────────────────
  //  TARJETAS DEL DÍA
  // ──────────────────────────────────────────────────────────────
  private async cargarTarjetas(): Promise<void> {
    this.cargandoTarjetas.set(true);
    try {
      // Nota: getRelevoHoy(1) y (2) usan la fecha actual, no la seleccionada.
      // Para mostrar las tarjetas de la fecha seleccionada, deberíamos pasar la fecha.
      // Como el endpoint actual no soporta fecha, usamos la fecha seleccionada para filtrar la tabla,
      // pero las tarjetas seguirán mostrando el día actual. Para mejor UX, podríamos cambiar el endpoint,
      // pero por simplicidad mantenemos las tarjetas para hoy y la tabla para la fecha seleccionada.
      const [diurno, nocturno] = await Promise.all([
        firstValueFrom(this.grService.getRelevoHoy(1)),
        firstValueFrom(this.grService.getRelevoHoy(2))
      ]);
      this.relevoDiurno.set(diurno);
      this.relevoNocturno.set(nocturno);
    } catch (error) {
      console.error('Error cargando tarjetas', error);
    } finally {
      this.cargandoTarjetas.set(false);
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  TABLA DE HISTORIAL
  // ──────────────────────────────────────────────────────────────
  private cargarTabla(): void {
    this.cargandoTabla.set(true);
    const filtros: FiltrarRelevosRequest = {
      page: this.paginaActual(),
      pageSize: this.porPagina,
      fechaDesde: this.layoutSvc.filterValues()['fechaDesde'] || undefined,
      fechaHasta: this.layoutSvc.filterValues()['fechaHasta'] || undefined,
      configTurnoId: this.layoutSvc.filterValues()['configTurnoId'] ? +this.layoutSvc.filterValues()['configTurnoId'] : undefined,
      estado: this.layoutSvc.filterValues()['estado'] || undefined
    };
    this.grService.getRelevosPaginados(filtros).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.relevos.set(res.items);
        this.totalRegistros.set(res.totalCount);
        this.cargandoTabla.set(false);
      },
      error: () => {
        this.cargandoTabla.set(false);
        this.alert.error('No se pudieron cargar los relevos');
      }
    });
  }

  cambiarPagina(delta: number): void {
    const nueva = this.paginaActual() + delta;
    if (nueva >= 1 && nueva <= this.totalPaginas()) {
      this.paginaActual.set(nueva);
      this.cargarTabla();
    }
  }

  ejecutarBusqueda(): void {
    this.paginaActual.set(1);
    this.cargarTabla();
  }

  limpiarFiltros(): void {
    this.layoutSvc.searchValue.set('');
    this.layoutSvc.filterValues.set({});
    this.paginaActual.set(1);
    this.cargarTabla();
  }

  // ──────────────────────────────────────────────────────────────
  //  DETALLE DEL RELEVO (modal con pestañas)
  // ──────────────────────────────────────────────────────────────
  async verDetalle(relevoId: number): Promise<void> {
    this.modalAbierto.set(true);
    this.cargandoDetalle.set(true);
    try {
      const detalle = await firstValueFrom(this.grService.getRelevoDetalle(relevoId));
      this.relevoDetalle.set(detalle ?? null);
    } catch (error) {
      this.alert.error('No se pudo cargar el detalle del relevo');
    } finally {
      this.cargandoDetalle.set(false);
    }
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
    this.relevoDetalle.set(null);
  }

  // ──────────────────────────────────────────────────────────────
  //  CAMBIAR ESTADO
  // ──────────────────────────────────────────────────────────────
  abrirModalEstado(relevoId: number, estadoActual: string): void {
    this.relevoIdParaEstado.set(relevoId);
    this.estadoSeleccionado.set(estadoActual);
    this.modalEstadoAbierto.set(true);
  }

  async confirmarCambioEstado(): Promise<void> {
    const id = this.relevoIdParaEstado();
    if (!id) return;
    const nuevoEstado = this.estadoSeleccionado();
    const dto: ActualizarEstadoRelevoRequest = { estado: nuevoEstado };
    this.grService.actualizarEstadoRelevo(id, dto).subscribe({
      next: () => {
        this.alert.exito(`Estado del relevo actualizado a ${nuevoEstado}`);
        this.modalEstadoAbierto.set(false);
        this.cargarTabla();
        this.cargarTarjetas();
      },
      error: () => this.alert.error('No se pudo actualizar el estado')
    });
  }

  // ──────────────────────────────────────────────────────────────
  //  ASIGNAR GUARDIA MANUALMENTE
  // ──────────────────────────────────────────────────────────────
  async abrirModalAsignacion(relevoId: number, rol: 'Saliente' | 'Entrante'): Promise<void> {
    const relevo = this.relevos().find(r => r.id === relevoId);
    const yaExiste = rol === 'Saliente' ? relevo?.nombreSaliente : relevo?.nombreEntrante;
    if (yaExiste) {
      this.alert.error(`El relevo ya tiene un ${rol} asignado.`);
      return;
    }
    this.asignacionRelevoId.set(relevoId);
    this.asignacionRol.set(rol);
    try {
      const perfiles = await firstValueFrom(this.grService.getPerfilesActivos());
      this.perfilesDisponibles.set(perfiles?.map(p => ({ id: p.id, nombre: p.nombreCompleto })) ?? []);
      this.modalAsignacionAbierto.set(true);
    } catch (error) {
      this.alert.error('No se pudieron cargar los guardias');
    }
  }

  async guardarAsignacion(): Promise<void> {
    const relevoId = this.asignacionRelevoId();
    const perfilId = this.asignacionPerfilId();
    const rol = this.asignacionRol();
    if (!relevoId || !perfilId) {
      this.alert.error('Selecciona un guardia');
      return;
    }
    const request: AsignarParticipanteRequest = { relevoId, perfilId, rol };
    this.grService.asignarParticipante(relevoId, request).subscribe({
      next: () => {
        this.alert.exito(`Guardia asignado como ${rol}`);
        this.modalAsignacionAbierto.set(false);
        this.cargarTabla();
        this.cargarTarjetas();
      },
      error: (err) => {
        if (err.status === 409) {
          this.alert.error(`El relevo ya tiene un ${rol} asignado.`);
        } else {
          this.alert.error('No se pudo asignar el guardia');
        }
      }
    });
  }

  // ──────────────────────────────────────────────────────────────
  //  CREAR RELEVO MANUAL
  // ──────────────────────────────────────────────────────────────
  abrirModalCrearRelevo(): void {
    this.nuevoRelevoTurnoId.set(null);
    this.nuevoRelevoFecha.set(new Date().toISOString().split('T')[0]);
    this.modalCrearRelevoAbierto.set(true);
  }

  cerrarModalCrearRelevo(): void {
    this.modalCrearRelevoAbierto.set(false);
  }

  async crearRelevo(): Promise<void> {
    const turnoId = this.nuevoRelevoTurnoId();
    const fecha = this.nuevoRelevoFecha();
    if (!turnoId) {
      this.alert.error('Selecciona un turno');
      return;
    }
    if (!fecha) {
      this.alert.error('Selecciona una fecha');
      return;
    }
    try {
      const dto: CrearRelevoRequest = { configTurnoId: turnoId, fecha };
      await firstValueFrom(this.grService.crearRelevo(dto));
      this.alert.exito('Relevo creado correctamente');
      this.modalCrearRelevoAbierto.set(false);
      this.cargarTarjetas();
      this.cargarTabla();
    } catch (error) {
      this.alert.error('No se pudo crear el relevo');
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  CARGAR OPCIONES PARA FILTROS Y MODALES
  // ──────────────────────────────────────────────────────────────
  private cargarOpcionesTurnos(): void {
    this.grService.getConfigTurnosActivos().subscribe({
      next: (turnos) => {
        const opts = turnos.map(t => ({ label: t.nombre, value: t.id.toString() }));
        this.turnosOptions.set(opts);
        const currentFilters = this.layoutSvc.subheaderFilters();
        const idx = currentFilters.findIndex(f => f.key === 'configTurnoId');
        if (idx !== -1) {
          const updated = [...currentFilters];
          updated[idx] = { ...updated[idx], options: opts };
          this.layoutSvc.subheaderFilters.set(updated);
        }
      },
      error: () => console.error('Error cargando turnos para filtro')
    });
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPERS VISUALES
  // ──────────────────────────────────────────────────────────────
  getEstadoVariant(estado: string): string {
    switch (estado) {
      case 'Pendiente': return 'gray';
      case 'EnCurso': return 'blue';
      case 'Completado': return 'green';
      case 'Incompleto': return 'red';
      default: return 'gray';
    }
  }

  formatFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-MX');
  }

  puedeAdministrar(): boolean {
    const rol = this.authSvc.proyectoActivo()?.rolEnProyecto;
    return rol === 'Gerente' || rol === 'Supervisor';
  }

  async cambiarFecha(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const nuevaFecha = input.value;
    this.fechaSeleccionada.set(nuevaFecha);
    // Recargar tarjetas (aunque actualmente getRelevoHoy usa la fecha actual,
    // esto mantiene la coherencia y evita errores)
    await this.cargarTarjetas();
  }
}