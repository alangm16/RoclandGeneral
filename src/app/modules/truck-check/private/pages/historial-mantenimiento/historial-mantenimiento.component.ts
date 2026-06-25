import { Component, OnInit, OnDestroy, inject, signal, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, combineLatest, forkJoin } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LayoutService } from '../../../../../core/services/layout.service';
import { TruckCheckService } from '../../../services/truckcheck-services';
import { AlertService } from '../../../../../shared/components/swal-alert/alert.service';
import { DataTableComponent, DataTableColumn } from '../../../../../shared/components/data-table/data-table.component';
import { ModalComponent } from '../../../../../shared/components/modal/modal.component';
import { BadgeComponent } from '../../../../../shared/components/badge/badge-component';
import { Mantenimiento, FiltroHistorialMantenimiento, VehiculoResponse, TipoMantenimiento, CrearMantenimiento } from '../../../models/truckcheck.models';

@Component({
  selector: 'app-historial-mantenimiento',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DataTableComponent,
    ModalComponent,
  ],
  templateUrl: './historial-mantenimiento.component.html',
  styleUrls: ['./historial-mantenimiento.component.scss']
})
export class HistorialMantenimientoComponent implements OnInit, OnDestroy {
  private layoutSvc = inject(LayoutService);
  private truckSvc = inject(TruckCheckService);
  private fb = inject(FormBuilder);
  private alert = inject(AlertService);
  private injector = inject(Injector);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  // ── Estado de la lista ──
  registros = signal<Mantenimiento[]>([]);
  cargando = signal(false);
  vehiculos = signal<VehiculoResponse[]>([]);
  tipos = signal<TipoMantenimiento[]>([]);

  // ── Modal de detalle ──
  modalDetalleAbierto = signal(false);
  detalleSeleccionado = signal<Mantenimiento | null>(null);

  // ── Modal de registro ──
  modalRegistroAbierto = signal(false);
  formRegistro: FormGroup;
  cargandoCatalogos = signal(false);
  enviandoRegistro = signal(false);

  columnas: DataTableColumn[] = [
    { key: 'fechaRealizacion', label: 'FECHA' },
    { key: 'placas', label: 'VEHÍCULO' },
    { key: 'tipoMantenimiento', label: 'TIPO' },
    { key: 'kmAlMomento', label: 'KM' },
    { key: 'costo', label: 'COSTO' },
    { key: 'taller', label: 'TALLER' },
    { key: 'acciones', label: '', cellClass: 'text-end' }
  ];

  constructor() {
    this.formRegistro = this.fb.group({
      IdVehiculo: ['', Validators.required],
      IdTipoMantenimiento: ['', Validators.required],
      FechaRealizacion: [new Date().toISOString().slice(0, 16), Validators.required],
      KmAlMomento: ['', [Validators.required, Validators.min(0)]],
      Costo: [null],
      Taller: [''],
      Observaciones: ['']
    });
  }

  ngOnInit(): void {
    this.configurarSubheader();
    this.cargarCatalogosFiltros();
    // Observar cambios en búsqueda y filtros
    combineLatest([
      toObservable(this.layoutSvc.filterValues, { injector: this.injector }),
      toObservable(this.layoutSvc.searchValue, { injector: this.injector })
    ]).pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => this.cargarHistorial());

    this.cargarHistorial();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.layoutSvc.resetSubheader();
  }

  private configurarSubheader(): void {
    this.layoutSvc.setSubheader({
      title: 'Historial de Mantenimientos',
      showSearch: true,
      searchPlaceholder: 'Buscar por taller...',
      filters: [
        { type: 'date', key: 'fechaInicio', placeholder: 'Desde' },
        { type: 'date', key: 'fechaFin', placeholder: 'Hasta' },
        { type: 'select', key: 'idVehiculo', placeholder: 'Todos los vehículos', options: [] },
        { type: 'select', key: 'idTipoMantenimiento', placeholder: 'Todos los tipos', options: [] }
      ],
      actions: [
        {
          label: 'Registrar',
          icon: 'bi-plus-circle',
          variant: 'flat',
          handler: () => this.abrirRegistroModal()
        },
        { label: 'Buscar', icon: 'bi-search', variant: 'flat', handler: () => this.cargarHistorial() },
        { label: 'Limpiar', icon: 'bi-arrow-counterclockwise', variant: 'stroked', handler: () => this.limpiarFiltros() }
      ]
    });
  }

  private cargarCatalogosFiltros(): void {
    this.truckSvc.getVehiculos().pipe(takeUntil(this.destroy$)).subscribe({
      next: (v) => {
        this.vehiculos.set(v);
        this.actualizarOpcionesFiltro('idVehiculo', v.map(v => ({ label: v.placas, value: v.id.toString() })));
      }
    });
    this.truckSvc.getTiposMantenimiento(false).pipe(takeUntil(this.destroy$)).subscribe({
      next: (t) => {
        this.tipos.set(t);
        this.actualizarOpcionesFiltro('idTipoMantenimiento', t.map(t => ({ label: t.nombre, value: t.id.toString() })));
      }
    });
  }

  private actualizarOpcionesFiltro(key: string, options: { label: string; value: string }[]): void {
    const filters = this.layoutSvc.subheaderFilters();
    const idx = filters.findIndex(f => f.key === key);
    if (idx !== -1) {
      const updated = [...filters];
      updated[idx] = { ...updated[idx], options };
      this.layoutSvc.subheaderFilters.set(updated);
    }
  }

  cargarHistorial(): void {
    this.cargando.set(true);
    const raw = this.layoutSvc.filterValues();
    const search = this.layoutSvc.searchValue().trim();
    const filtro: FiltroHistorialMantenimiento = {
      IdVehiculo: raw['idVehiculo'] ? +raw['idVehiculo'] : undefined,
      TipoMantenimiento: raw['idTipoMantenimiento'] ? +raw['idTipoMantenimiento'] : undefined,
      FechaDesde: raw['fechaInicio'] || undefined,
      FechaHasta: raw['fechaFin'] || undefined,
      Taller: search || undefined
    };
    this.truckSvc.getHistorialMantenimiento(filtro)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => { this.registros.set(data); this.cargando.set(false); },
        error: () => { this.cargando.set(false); this.alert.error('Error al cargar historial'); }
      });
  }

  limpiarFiltros(): void {
    this.layoutSvc.searchValue.set('');
    this.layoutSvc.filterValues.set({});
    this.cargarHistorial();
  }

  // ── Modal de detalle ──
  verDetalle(m: Mantenimiento): void {
    this.detalleSeleccionado.set(m);
    this.modalDetalleAbierto.set(true);
  }

  cerrarModalDetalle(): void {
    this.modalDetalleAbierto.set(false);
    this.detalleSeleccionado.set(null);
  }

  // ── Modal de registro ──
  abrirRegistroModal(): void {
    // Cargar catálogos si aún no están cargados
    if (this.vehiculos().length === 0 || this.tipos().length === 0) {
      this.cargarCatalogosRegistro();
    }
    this.formRegistro.reset({
      FechaRealizacion: new Date().toISOString().slice(0, 16)
    });
    this.modalRegistroAbierto.set(true);
  }

  cerrarRegistroModal(): void {
    this.modalRegistroAbierto.set(false);
  }

  private cargarCatalogosRegistro(): void {
    this.cargandoCatalogos.set(true);
    forkJoin({
      vehiculos: this.truckSvc.getVehiculos(),
      tipos: this.truckSvc.getTiposMantenimiento(true)
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ vehiculos, tipos }) => {
          this.vehiculos.set(vehiculos);
          this.tipos.set(tipos);
          this.cargandoCatalogos.set(false);
        },
        error: () => {
          this.cargandoCatalogos.set(false);
          this.alert.error('Error al cargar catálogos');
        }
      });
  }

  async guardarRegistro(): Promise<void> {
    if (this.formRegistro.invalid) {
      this.alert.advertencia('Completa todos los campos obligatorios');
      return;
    }

    const valores = this.formRegistro.value;
    const dto: CrearMantenimiento = {
      IdVehiculo: +valores.IdVehiculo,
      IdTipoMantenimiento: +valores.IdTipoMantenimiento,
      FechaRealizacion: new Date(valores.FechaRealizacion).toISOString(),
      kmAlMomento: +valores.KmAlMomento,
      Costo: valores.Costo ? +valores.Costo : undefined,
      Taller: valores.Taller?.trim() || undefined,
      Observaciones: valores.Observaciones?.trim() || undefined
    };

    const tipoNombre = this.tipos().find(t => t.id === dto.IdTipoMantenimiento)?.nombre || 'el tipo';
    const placas = this.vehiculos().find(v => v.id === dto.IdVehiculo)?.placas || 'el vehículo';

    const confirmado = await this.alert.confirmar({
      titulo: 'Registrar mantenimiento',
      texto: `¿Confirmas el registro de ${tipoNombre} para el vehículo ${placas}?`,
      labelConfirmar: 'Sí, registrar',
      labelCancelar: 'Cancelar'
    });
    if (!confirmado) return;

    this.enviandoRegistro.set(true);
    this.truckSvc.registrarMantenimiento(dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.enviandoRegistro.set(false);
          this.alert.exito('Mantenimiento registrado correctamente');
          this.cerrarRegistroModal();
          this.cargarHistorial(); // Refrescar lista
        },
        error: (err) => {
          this.enviandoRegistro.set(false);
          this.alert.error(err.error?.mensaje || 'Error al registrar el mantenimiento');
        }
      });
  }

  formatFecha(fecha: string): string {
    if (!fecha) return '—';
    const d = new Date(fecha);
    return d.toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}