import { Component, OnInit, OnDestroy, inject, signal, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, combineLatest } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';
import { LayoutService } from '../../../../../core/services/layout.service';
import { TruckCheckService } from '../../../services/truckcheck-services';
import { AlertService } from '../../../../../shared/components/swal-alert/alert.service';
import { DataTableComponent, DataTableColumn } from '../../../../../shared/components/data-table/data-table.component';
import { BadgeComponent } from '../../../../../shared/components/badge/badge-component';
import { TruckAlertaMantenimiento, VehiculoResponse } from '../../../models/truckcheck.models';

@Component({
  selector: 'app-alertas-mantenimiento',
  standalone: true,
  imports: [CommonModule, DataTableComponent, BadgeComponent],
  templateUrl: './alertas-mantenimiento.component.html',
  styleUrls: ['./alertas-mantenimiento.component.scss']
})
export class AlertasMantenimientoComponent implements OnInit, OnDestroy {
  private layoutSvc = inject(LayoutService);
  private truckSvc = inject(TruckCheckService);
  private alert = inject(AlertService);
  private injector = inject(Injector);
  private destroy$ = new Subject<void>();

  alertas = signal<TruckAlertaMantenimiento[]>([]);
  cargando = signal(false);
  vehiculos = signal<VehiculoResponse[]>([]);

  columnas: DataTableColumn[] = [
    { key: 'placas', label: 'VEHÍCULO' },
    { key: 'tipoMantenimiento', label: 'TIPO' },
    { key: 'estado', label: 'ESTADO' },
    { key: 'kmRestantes', label: 'KM RESTANTES' },
    { key: 'diasRestantes', label: 'DÍAS RESTANTES' },
    { key: 'prioridadAlerta', label: 'PRIORIDAD' }
  ];

  ngOnInit(): void {
    this.configurarSubheader();
    this.cargarVehiculos();
    combineLatest([
      toObservable(this.layoutSvc.filterValues, { injector: this.injector })
    ]).pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => this.cargarAlertas());
    this.cargarAlertas();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.layoutSvc.resetSubheader();
  }

  private configurarSubheader(): void {
    this.layoutSvc.setSubheader({
      title: 'Alertas de Mantenimiento',
      showSearch: false,
      filters: [
        { type: 'select', key: 'idVehiculo', placeholder: 'Todos los vehículos', options: [] },
        { type: 'select', key: 'estado', placeholder: 'Todos los estados', options: [
          { label: 'VENCIDO', value: 'VENCIDO' },
          { label: 'PROXIMO', value: 'PROXIMO' },
          { label: 'OK', value: 'OK' },
          { label: 'SIN HISTORIAL', value: 'SIN HISTORIAL' }
        ]}
      ],
      actions: [
        { label: 'Actualizar', icon: 'bi-arrow-repeat', variant: 'flat', handler: () => this.cargarAlertas() }
      ]
    });
  }

  private cargarVehiculos(): void {
    this.truckSvc.getVehiculos().pipe(takeUntil(this.destroy$)).subscribe({
      next: (v) => {
        this.vehiculos.set(v);
        this.actualizarOpcionesFiltro('idVehiculo', v.map(v => ({ label: v.placas, value: v.id.toString() })));
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

  cargarAlertas(): void {
    this.cargando.set(true);
    const raw = this.layoutSvc.filterValues();
    const idVehiculo = raw['idVehiculo'] ? +raw['idVehiculo'] : undefined;
    const estado = raw['estado'] || undefined;
    this.truckSvc.getAlertasMantenimiento(idVehiculo, estado)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => { this.alertas.set(data); this.cargando.set(false); },
        error: () => { this.cargando.set(false); this.alert.error('Error al cargar alertas'); }
      });
  }

  getPrioridadLabel(prioridad: number): string {
    switch (prioridad) {
      case 3: return 'Alta';
      case 2: return 'Media';
      case 1: return 'Baja';
      default: return 'Sin historial';
    }
  }

  getPrioridadVariant(prioridad: number): 'red' | 'yellow' | 'green' | 'gray' {
    switch (prioridad) {
      case 3: return 'red';
      case 2: return 'yellow';
      case 1: return 'green';
      default: return 'gray';
    }
  }

  getEstadoVariant(estado: string): 'red' | 'yellow' | 'green' | 'gray' {
    switch (estado) {
      case 'VENCIDO': return 'red';
      case 'PROXIMO': return 'yellow';
      case 'OK': return 'green';
      default: return 'gray';
    }
  }
}