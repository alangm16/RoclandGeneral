import {
  Component, OnInit, OnDestroy, inject, signal, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, firstValueFrom } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LayoutService } from '../../../../../core/services/layout.service';
import { GuardiaRelevoService } from '../../../services/guardia-relevo.service';
import { AlertService } from '../../../../../shared/components/swal-alert/alert.service';
import {
  DataTableComponent,
  DataTableColumn,
} from '../../../../../shared/components/data-table/data-table.component';
import { BadgeComponent } from '../../../../../shared/components/badge/badge-component';
import { ModalComponent } from '../../../../../shared/components/modal/modal.component';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { IncidenciaDto } from '../../../models/guardia-relevo.models';

@Component({
  selector: 'app-guardia-relevo-incidencias',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DataTableComponent,
    BadgeComponent,
    ModalComponent,
    MatMenuModule,
    MatDividerModule,
  ],
  templateUrl: './incidencias.component.html',
  styleUrls: ['./incidencias.component.scss'],
})
export class IncidenciasComponent implements OnInit, OnDestroy {
  private layoutSvc = inject(LayoutService);
  private grService = inject(GuardiaRelevoService);
  private alert = inject(AlertService);
  private destroy$ = new Subject<void>();

  // Datos originales
  todasIncidencias = signal<IncidenciaDto[]>([]);
  incidenciasFiltradas = signal<IncidenciaDto[]>([]);
  cargando = signal(false);

  // Paginación cliente
  paginaActual = signal(1);
  readonly porPagina = 15;
  totalPaginas = computed(() => Math.max(1, Math.ceil(this.incidenciasFiltradas().length / this.porPagina)));
  incidenciasPagina = computed(() => {
    const start = (this.paginaActual() - 1) * this.porPagina;
    return this.incidenciasFiltradas().slice(start, start + this.porPagina);
  });

  // Columnas de la tabla
  columnas: DataTableColumn[] = [
    { key: 'fechaDeteccionLocal', label: 'FECHA', cellClass: 'text-mono' },
    { key: 'punto', label: 'PUNTO' },
    { key: 'categoria', label: 'CATEGORÍA' },
    { key: 'guardiaSaliente', label: 'SALIENTE' },
    { key: 'guardiaEntrante', label: 'ENTRANTE' },
    { key: 'resuelta', label: 'ESTADO', cellClass: 'text-center' },
    { key: 'acciones', label: '', cellClass: 'text-end' },
  ];

  // Modal de detalle
  modalDetalleAbierto = signal(false);
  incidenciaSeleccionada = signal<IncidenciaDto | null>(null);

  ngOnInit(): void {
    this.layoutSvc.setSubheader({
      title: 'Incidencias',
      showSearch: false,
      filters: [
        { type: 'date', key: 'fechaDesde', placeholder: 'Fecha desde' },
        { type: 'date', key: 'fechaHasta', placeholder: 'Fecha hasta' },
        {
          type: 'select',
          key: 'resuelta',
          placeholder: 'Todos los estados',
          options: [
            { label: 'Abierta', value: 'false' },
            { label: 'Resuelta', value: 'true' },
          ],
        },
      ],
      actions: [
        { label: 'Buscar', icon: 'bi-search', variant: 'flat', handler: () => this.aplicarFiltros() },
        { label: 'Limpiar', icon: 'bi-arrow-counterclockwise', variant: 'stroked', handler: () => this.limpiarFiltros() },
      ],
    });

    this.cargarIncidencias();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.layoutSvc.resetSubheader();
  }

  private async cargarIncidencias(): Promise<void> {
    this.cargando.set(true);
    try {
      const data = await firstValueFrom(this.grService.getIncidencias(null));
      this.todasIncidencias.set(data);
      this.aplicarFiltros();
    } catch (error) {
      this.alert.error('No se pudieron cargar las incidencias');
    } finally {
      this.cargando.set(false);
    }
  }

  aplicarFiltros(): void {
    const filtros = this.layoutSvc.filterValues();
    const desde = filtros['fechaDesde'] ? new Date(filtros['fechaDesde']) : null;
    const hasta = filtros['fechaHasta'] ? new Date(filtros['fechaHasta']) : null;
    const resueltaStr = filtros['resuelta'];
    const soloResuelta = resueltaStr !== undefined && resueltaStr !== '' ? resueltaStr === 'true' : null;

    let filtradas = [...this.todasIncidencias()];

    if (desde) {
      filtradas = filtradas.filter(i => new Date(i.fechaDeteccionLocal) >= desde);
    }
    if (hasta) {
      filtradas = filtradas.filter(i => new Date(i.fechaDeteccionLocal) <= hasta);
    }
    if (soloResuelta !== null) {
      filtradas = filtradas.filter(i => i.resuelta === soloResuelta);
    }

    this.incidenciasFiltradas.set(filtradas);
    this.paginaActual.set(1);
  }

  limpiarFiltros(): void {
    this.layoutSvc.filterValues.set({});
    this.aplicarFiltros();
  }

  cambiarPagina(delta: number): void {
    const nueva = this.paginaActual() + delta;
    if (nueva >= 1 && nueva <= this.totalPaginas()) {
      this.paginaActual.set(nueva);
    }
  }

  verDetalle(incidencia: IncidenciaDto): void {
    this.incidenciaSeleccionada.set(incidencia);
    this.modalDetalleAbierto.set(true);
  }

  cerrarModalDetalle(): void {
    this.modalDetalleAbierto.set(false);
    this.incidenciaSeleccionada.set(null);
  }

  async resolverIncidencia(incidencia: IncidenciaDto): Promise<void> {
    if (incidencia.resuelta) {
      this.alert.advertencia('Esta incidencia ya está resuelta');
      return;
    }
    const confirm = await this.alert.confirmar({ texto: '¿Marcar esta incidencia como resuelta?' });
    if (!confirm) return;
    try {
      await firstValueFrom(this.grService.resolverIncidencia(incidencia.id));
      this.alert.exito('Incidencia resuelta');
      // Recargar lista
      await this.cargarIncidencias();
    } catch (error) {
      this.alert.error('No se pudo resolver la incidencia');
    }
  }

  getEstadoBadge(resuelta: boolean): string {
    return resuelta ? 'green' : 'red';
  }

  getEstadoTexto(resuelta: boolean): string {
    return resuelta ? 'Resuelta' : 'Abierta';
  }

  formatFecha(fecha: string): string {
    return new Date(fecha).toLocaleString('es-MX');
  }
}