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
import { TruckAlertaKmAnomalo, VehiculoResponse } from '../../../models/truckcheck.models';

@Component({
  selector: 'app-alertas-km-anomalo',
  standalone: true,
  imports: [CommonModule, DataTableComponent],
  templateUrl: './alertas-km-anomalo.component.html',
  styleUrls: ['./alertas-km-anomalo.component.scss']
})
export class AlertasKmAnomaloComponent implements OnInit, OnDestroy {
  private layoutSvc = inject(LayoutService);
  private truckSvc = inject(TruckCheckService);
  private alert = inject(AlertService);
  private injector = inject(Injector);
  private destroy$ = new Subject<void>();

  alertas = signal<TruckAlertaKmAnomalo[]>([]);
  cargando = signal(false);
  vehiculos = signal<VehiculoResponse[]>([]);

  columnas: DataTableColumn[] = [
    { key: 'placas', label: 'VEHÍCULO' },
    { key: 'fechaSalida', label: 'FECHA SALIDA' },
    { key: 'nombreChofer', label: 'CHOFER' },
    { key: 'kmRecorridos', label: 'KM RECORRIDOS' },
    { key: 'zscore', label: 'Z-SCORE' },
    { key: 'umbralAlerta', label: 'UMBRAL' }
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
      title: 'Alertas de Kilometraje Anómalo',
      showSearch: false,
      filters: [
        { type: 'select', key: 'idVehiculo', placeholder: 'Todos los vehículos', options: [] }
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
    this.truckSvc.getAlertasKmAnomalo(idVehiculo)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => { this.alertas.set(data); this.cargando.set(false); },
        error: () => { this.cargando.set(false); this.alert.error('Error al cargar alertas'); }
      });
  }

  formatFecha(fecha: string): string {
    if (!fecha) return '—';
    const d = new Date(fecha);
    return d.toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}