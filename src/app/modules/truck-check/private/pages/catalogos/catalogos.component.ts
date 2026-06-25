// catalogos.component.ts
import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { LayoutService } from '../../../../../core/services/layout.service';
import { TruckCheckService } from '../../../services/truckcheck-services';
import { AlertService } from '../../../../../shared/components/swal-alert/alert.service';
import { ModalComponent } from '../../../../../shared/components/modal/modal.component';
import { BadgeComponent } from '../../../../../shared/components/badge/badge-component';
import { DataTableComponent, DataTableColumn } from '../../../../../shared/components/data-table/data-table.component';
import {
  VehiculoResponse,
  SucursalResponse,
  ChoferResponse,
  ZonaResponse,
  CrearVehiculoRequest,
  ActualizarVehiculoRequest,
  ActualizarEstadoVehiculoRequest,
  CrearSucursalRequest,
  ActualizarSucursalRequest,
  ActualizarEstadoSucursalRequest,
  CrearChoferRequest,
  ActualizarChoferRequest,
  ActualizarEstadoChoferRequest,
  CatalogosResponse,
} from '../../../models/truckcheck.models';
import { response } from 'express';

@Component({
  selector: 'app-catalogos-truckcheck',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatMenuModule,
    ModalComponent,
    BadgeComponent,
    DataTableComponent,
  ],
  templateUrl: './catalogos.component.html',
  styleUrls: ['./catalogos.component.scss'],
})
export class CatalogosTruckCheckComponent implements OnInit, OnDestroy {
  private layoutSvc = inject(LayoutService);
  private truckSvc = inject(TruckCheckService);
  private fb = inject(FormBuilder);
  private alert = inject(AlertService);
  private destroy$ = new Subject<void>();

  // === Estados por catálogo ===
  vehiculos = signal<VehiculoResponse[]>([]);
  sucursales = signal<SucursalResponse[]>([]);
  choferes = signal<ChoferResponse[]>([]);
  zonas = signal<ZonaResponse[]>([]);
  cargando = signal(false); // carga global

  // === Modales (solo para vehiculos, sucursales, choferes) ===
  modalAbierto = signal<{ tipo: string; abierto: boolean }>({ tipo: '', abierto: false });
  editandoId = signal<number | null>(null);
  formModal: FormGroup;

  // === Columnas ===
  columnasVehiculos: DataTableColumn[] = [
    { key: 'placas', label: 'PLACAS' },
    { key: 'marca' , label: 'MARCA' },
    { key: 'modelo', label: 'MODELO'},
    { key: 'activo', label: 'ESTADO' },
    { key: 'acciones', label: '', cellClass: 'text-end' },
  ];
  columnasSucursales: DataTableColumn[] = [
    { key: 'nombre', label: 'NOMBRE' },
    { key: 'activo', label: 'ESTADO' },
    { key: 'acciones', label: '', cellClass: 'text-end' },
  ];
  columnasChoferes: DataTableColumn[] = [
    { key: 'nombre', label: 'NOMBRE' },
    { key: 'activo', label: 'ESTADO' },
    { key: 'acciones', label: '', cellClass: 'text-end' },
  ];
  columnasZonas: DataTableColumn[] = [
    { key: 'nombre', label: 'NOMBRE' },
    { key: 'activo', label: 'ESTADO' },
    // Sin columna de acciones porque es solo lectura
  ];

  constructor() {
    this.formModal = this.fb.group({
      nombre: ['', Validators.required],
      placas: [''],
    });
  }

  ngOnInit(): void {
    this.layoutSvc.setSubheader({ title: 'Catálogos TruckCheck', showSearch: false });
    this.cargarCatalogos(); // ← esta sola ya carga todo
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.layoutSvc.resetSubheader();
  }

  private cargarVehiculos(): void {
    this.truckSvc.getVehiculos()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
            next: (response: VehiculoResponse[]) => {
                this.vehiculos.set(response); // response ya es un array
            },
            error: () => this.alert.error('Error al cargar vehículos')
        });
  }

  private cargarCatalogos(): void {
  this.cargando.set(true);

  forkJoin({
    catalogos: this.truckSvc.getCatalogos(),
    vehiculos: this.truckSvc.getVehiculos(),
  })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: ({ catalogos, vehiculos }) => {
        this.vehiculos.set(vehiculos ?? []);
        this.sucursales.set(catalogos.sucursales ?? []);
        this.choferes.set(catalogos.choferes ?? []);
        this.zonas.set(catalogos.zonasDanio ?? []);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.alert.error('Error al cargar los catálogos');
      },
    });
}

  // === Vehículos ===
  async abrirModalVehiculo(vehiculo?: VehiculoResponse): Promise<void> {
    this.editandoId.set(vehiculo?.id ?? null);

    // Ajustar validadores: solo placas es requerido aquí
    this.formModal.get('placas')!.setValidators([Validators.required]);
    this.formModal.get('nombre')!.clearValidators();
    this.formModal.get('placas')!.updateValueAndValidity();
    this.formModal.get('nombre')!.updateValueAndValidity();

    this.formModal.reset({ placas: vehiculo?.placas ?? '', nombre: '' });
    this.modalAbierto.set({ tipo: 'vehiculo', abierto: true });
  }

  async guardarVehiculo(): Promise<void> {
    if (this.formModal.invalid) return;
    const placas = this.formModal.value.placas;
    if (!placas) return;

    const esEdicion = this.editandoId() !== null;
    const confirmado = esEdicion
      ? await this.alert.confirmarEditar(placas)
      : await this.alert.confirmarAgregar(placas);
    if (!confirmado) return;

    if (esEdicion) {
      const dto: ActualizarVehiculoRequest = { id: this.editandoId()!, placas: placas, activo: true };
      this.truckSvc.updateVehiculo(this.editandoId()!, dto)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => { this.cargarCatalogos(); this.cerrarModal(); this.alert.exito('Vehículo actualizado'); },
          error: () => this.alert.error('Error al actualizar')
        });
    } else {
      const dto: CrearVehiculoRequest = { placas: placas };
      this.truckSvc.crearVehiculo(dto)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => { this.cargarCatalogos(); this.cerrarModal(); this.alert.exito('Vehículo creado'); },
          error: () => this.alert.error('Error al crear')
        });
    }
  }

  async toggleEstadoVehiculo(vehiculo: VehiculoResponse): Promise<void> {
    const accion = vehiculo.activo ? 'desactivar' : 'activar';
    const confirmado = await this.alert.confirmar({
      titulo: `${vehiculo.activo ? 'Desactivar' : 'Activar'} vehículo`,
      texto: `¿${accion} las placas ${vehiculo.placas}?`,
      labelConfirmar: `Sí, ${accion}`,
      labelCancelar: 'Cancelar'
    });
    if (!confirmado) return;
    const dto: ActualizarEstadoVehiculoRequest = { id: vehiculo.id, activo: !vehiculo.activo };
    this.truckSvc.updateEstadoVehiculo(vehiculo.id, dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.cargarCatalogos(),
        error: () => this.alert.error(`No se pudo ${accion} el vehículo`)
      });
  }

  // === Sucursales ===
  async abrirModalSucursal(sucursal?: SucursalResponse): Promise<void> {
    this.editandoId.set(sucursal?.id ?? null);

    // Ajustar validadores: solo nombre es requerido aquí
    this.formModal.get('nombre')!.setValidators([Validators.required]);
    this.formModal.get('placas')!.clearValidators();
    this.formModal.get('nombre')!.updateValueAndValidity();
    this.formModal.get('placas')!.updateValueAndValidity();

    this.formModal.reset({ nombre: sucursal?.nombre ?? '', placas: '' });
    this.modalAbierto.set({ tipo: 'sucursal', abierto: true });
  }

  async guardarSucursal(): Promise<void> {
    if (this.formModal.invalid) return;
    const nombre = this.formModal.value.nombre;
    if (!nombre) return;
    const esEdicion = this.editandoId() !== null;
    const confirmado = esEdicion
      ? await this.alert.confirmarEditar(nombre)
      : await this.alert.confirmarAgregar(nombre);
    if (!confirmado) return;

    if (esEdicion) {
      const dto: ActualizarSucursalRequest = { id: this.editandoId()!, nombre: nombre, activo: true };
      this.truckSvc.updateSucursal(this.editandoId()!, dto)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => { this.cargarCatalogos(); this.cerrarModal(); this.alert.exito('Sucursal actualizada'); },
          error: () => this.alert.error('Error al actualizar')
        });
    } else {
      const dto: CrearSucursalRequest = { nombre: nombre };
      this.truckSvc.crearSucursal(dto)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => { this.cargarCatalogos(); this.cerrarModal(); this.alert.exito('Sucursal creada'); },
          error: () => this.alert.error('Error al crear')
        });
    }
  }

  async toggleEstadoSucursal(sucursal: SucursalResponse): Promise<void> {
    const accion = sucursal.activo ? 'desactivar' : 'activar';
    const confirmado = await this.alert.confirmar({
      titulo: `${sucursal.activo ? 'Desactivar' : 'Activar'} sucursal`,
      texto: `¿${accion} la sucursal "${sucursal.nombre}"?`,
      labelConfirmar: `Sí, ${accion}`,
      labelCancelar: 'Cancelar'
    });
    if (!confirmado) return;
    const dto: ActualizarEstadoSucursalRequest = { id: sucursal.id, activo: !sucursal.activo };
    this.truckSvc.updateEstadoSucursal(sucursal.id, dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.cargarCatalogos(),
        error: () => this.alert.error(`No se pudo ${accion} la sucursal`)
      });
  }

  // === Choferes ===
  async abrirModalChofer(chofer?: ChoferResponse): Promise<void> {
    this.editandoId.set(chofer?.id ?? null);

    // Mismo caso que sucursal
    this.formModal.get('nombre')!.setValidators([Validators.required]);
    this.formModal.get('placas')!.clearValidators();
    this.formModal.get('nombre')!.updateValueAndValidity();
    this.formModal.get('placas')!.updateValueAndValidity();

    this.formModal.reset({ nombre: chofer?.nombre ?? '', placas: '' });
    this.modalAbierto.set({ tipo: 'chofer', abierto: true });
  }

  async guardarChofer(): Promise<void> {
    if (this.formModal.invalid) return;
    const nombre = this.formModal.value.nombre;
    if (!nombre) return;
    const esEdicion = this.editandoId() !== null;
    const confirmado = esEdicion
      ? await this.alert.confirmarEditar(nombre)
      : await this.alert.confirmarAgregar(nombre);
    if (!confirmado) return;

    if (esEdicion) {
      const dto: ActualizarChoferRequest = { id: this.editandoId()!, nombre: nombre, activo: true };
      this.truckSvc.updateChofer(this.editandoId()!, dto)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => { this.cargarCatalogos(); this.cerrarModal(); this.alert.exito('Chofer actualizado'); },
          error: () => this.alert.error('Error al actualizar')
        });
    } else {
      const dto: CrearChoferRequest = { nombre: nombre };
      this.truckSvc.crearChofer(dto)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => { this.cargarCatalogos(); this.cerrarModal(); this.alert.exito('Chofer creado'); },
          error: () => this.alert.error('Error al crear')
        });
    }
  }

  async toggleEstadoChofer(chofer: ChoferResponse): Promise<void> {
    const accion = chofer.activo ? 'desactivar' : 'activar';
    const confirmado = await this.alert.confirmar({
      titulo: `${chofer.activo ? 'Desactivar' : 'Activar'} chofer`,
      texto: `¿${accion} al chofer "${chofer.nombre}"?`,
      labelConfirmar: `Sí, ${accion}`,
      labelCancelar: 'Cancelar'
    });
    if (!confirmado) return;
    const dto: ActualizarEstadoChoferRequest = { id: chofer.id, activo: !chofer.activo };
    this.truckSvc.updateEstadoChofer(chofer.id, dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.cargarCatalogos(),
        error: () => this.alert.error(`No se pudo ${accion} el chofer`)
      });
  }

  cerrarModal(): void {
    this.modalAbierto.set({ tipo: '', abierto: false });
    this.editandoId.set(null);
    this.formModal.get('nombre')!.clearValidators();
    this.formModal.get('placas')!.clearValidators();
    this.formModal.reset();
  }
}