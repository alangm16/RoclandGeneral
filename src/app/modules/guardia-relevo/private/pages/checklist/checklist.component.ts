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
import { DataTableComponent, DataTableColumn } from '../../../../../shared/components/data-table/data-table.component';
import { BadgeComponent } from '../../../../../shared/components/badge/badge-component';
import { ModalComponent } from '../../../../../shared/components/modal/modal.component';
import { MatTabsModule } from '@angular/material/tabs';
import { AuthService } from '../../../../../core/auth/auth.service';
import {
  ChecklistResumenDto,
  ChecklistDetalleDto,
  IncidenciaDto
} from '../../../models/guardia-relevo.models';

@Component({
  selector: 'app-guardia-relevo-checklists',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DataTableComponent,
    BadgeComponent,
    ModalComponent,
    MatTabsModule
  ],
  templateUrl: './checklist.component.html',
  styleUrls: ['./checklist.component.scss']
})
export class ChecklistComponent implements OnInit, OnDestroy {
  private layoutSvc = inject(LayoutService);
  private grService = inject(GuardiaRelevoService);
  private alert = inject(AlertService);
  private authSvc = inject(AuthService);
  private destroy$ = new Subject<void>();

  // Lista de rondines
  rondines = signal<ChecklistResumenDto[]>([]);
  rondinesFiltrados = signal<ChecklistResumenDto[]>([]);
  cargando = signal(false);

  // Filtros
  guardiasDisponibles = signal<{ id: number; nombre: string }[]>([]);

  // Paginación cliente
  paginaActual = signal(1);
  readonly porPagina = 15;
  totalPaginas = computed(() => Math.max(1, Math.ceil(this.rondinesFiltrados().length / this.porPagina)));
  rondinesPagina = computed(() => {
    const start = (this.paginaActual() - 1) * this.porPagina;
    return this.rondinesFiltrados().slice(start, start + this.porPagina);
  });

  // Modal detalle
  modalAbierto = signal(false);
  detalleActual = signal<ChecklistDetalleDto | null>(null);
  cargandoDetalle = signal(false);
  // Incidencias asociadas al checklist actual
  incidenciasChecklistActual = signal<IncidenciaDto[]>([]);

  // Columnas tabla
  columnas: DataTableColumn[] = [
    { key: 'fechaHoraLocal', label: 'FECHA', cellClass: 'text-mono' },
    { key: 'tipoRondin', label: 'TIPO' },
    { key: 'descripcionRondin', label: 'DESCRIPCIÓN' },
    { key: 'guardia', label: 'GUARDIA' },
    { key: 'todoOk', label: 'ESTADO', cellClass: 'text-center' },
    { key: 'tieneFirma', label: 'FIRMA', cellClass: 'text-center' },
    { key: 'acciones', label: '', cellClass: 'text-end' }
  ];

  ngOnInit(): void {
    this.layoutSvc.setSubheader({
      title: 'Rondines',
      showSearch: false,
      filters: [
        {
          type: 'select',
          key: 'guardia',
          placeholder: 'Todos los guardias',
          options: [] // se llenan después
        },
        { type: 'date', key: 'fechaDesde', placeholder: 'Fecha desde' },
        { type: 'date', key: 'fechaHasta', placeholder: 'Fecha hasta' }
      ],
      actions: [
        { label: 'Buscar', icon: 'bi-search', variant: 'flat', handler: () => this.aplicarFiltros() },
        { label: 'Limpiar', icon: 'bi-arrow-counterclockwise', variant: 'stroked', handler: () => this.limpiarFiltros() }
      ]
    });

    this.cargarRondines();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.layoutSvc.resetSubheader();
  }

  private async cargarRondines(): Promise<void> {
    this.cargando.set(true);
    try {
      const data = await firstValueFrom(this.grService.getHistorial());
      this.rondines.set(data);
      this.cargarGuardiasDesdeRondines(data);
      this.aplicarFiltros();
    } catch (error) {
      this.alert.error('No se pudieron cargar los rondines');
    } finally {
      this.cargando.set(false);
    }
  }

  private cargarGuardiasDesdeRondines(rondines: ChecklistResumenDto[]): void {
    const mapa = new Map<number, string>();
    rondines.forEach(r => mapa.set(r.idGuardia, r.guardia));
    const guardias = Array.from(mapa.entries()).map(([id, nombre]) => ({ id, nombre }));
    this.guardiasDisponibles.set(guardias);

    // Actualizar opciones del filtro en el layout
    const filters = this.layoutSvc.subheaderFilters();
    const idx = filters.findIndex(f => f.key === 'guardia');
    if (idx !== -1) {
      const updated = [...filters];
      updated[idx] = {
        ...updated[idx],
        options: guardias.map(g => ({ label: g.nombre, value: g.id.toString() }))
      };
      this.layoutSvc.subheaderFilters.set(updated);
    }
  }

  aplicarFiltros(): void {
    const filtros = this.layoutSvc.filterValues();
    const guardiaId = filtros['guardia'] ? Number(filtros['guardia']) : null;
    const desde = filtros['fechaDesde'] || '';
    const hasta = filtros['fechaHasta'] || '';

    let filtrados = [...this.rondines()];

    if (guardiaId) {
      filtrados = filtrados.filter(r => r.idGuardia === guardiaId);
    }
    if (desde) {
      filtrados = filtrados.filter(r => r.fechaHoraLocal >= desde);
    }
    if (hasta) {
      filtrados = filtrados.filter(r => r.fechaHoraLocal <= hasta);
    }

    this.rondinesFiltrados.set(filtrados);
    this.paginaActual.set(1);
  }

  limpiarFiltros(): void {
    this.layoutSvc.filterValues.set({});
    // No es necesario llamar a aplicarFiltros porque el set ya emite cambios y el subheader actualiza,
    // pero como el handler de "Limpiar" llama directamente a este método, debemos aplicar los filtros.
    this.aplicarFiltros();
  }

  cambiarPagina(delta: number): void {
    const nueva = this.paginaActual() + delta;
    if (nueva >= 1 && nueva <= this.totalPaginas()) {
      this.paginaActual.set(nueva);
    }
  }

  async verDetalle(id: number): Promise<void> {
    this.modalAbierto.set(true);
    this.cargandoDetalle.set(true);
    try {
      const detalle = await firstValueFrom(this.grService.getDetalleChecklist(id));
      this.detalleActual.set(detalle);
      // Cargar incidencias asociadas a este checklist (entrante o saliente)
      await this.cargarIncidenciasDelChecklist(id);
    } catch (error) {
      this.alert.error('No se pudo cargar el detalle del rondín');
    } finally {
      this.cargandoDetalle.set(false);
    }
  }

  private async cargarIncidenciasDelChecklist(checklistId: number): Promise<void> {
    try {
      // Traemos todas las incidencias y filtramos las que tengan este checklist como entrante o saliente
      const todas = await firstValueFrom(this.grService.getIncidencias(null));
      const filtradas = todas.filter(i => 
        i.idChecklistEntrante === checklistId || i.idChecklistSaliente === checklistId
      );
      this.incidenciasChecklistActual.set(filtradas);
    } catch (error) {
      console.error('Error cargando incidencias del checklist', error);
      this.incidenciasChecklistActual.set([]);
    }
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
    this.detalleActual.set(null);
    this.incidenciasChecklistActual.set([]);
  }

  async resolverIncidencia(incidenciaId: number): Promise<void> {
    const confirm = await this.alert.confirmar({ texto: '¿Marcar esta incidencia como resuelta?' });
    if (!confirm) return;
    try {
      await firstValueFrom(this.grService.resolverIncidencia(incidenciaId));
      this.alert.exito('Incidencia resuelta');
      // Recargar incidencias del checklist actual
      if (this.detalleActual()) {
        await this.cargarIncidenciasDelChecklist(this.detalleActual()!.id);
      }
    } catch (error) {
      this.alert.error('No se pudo resolver la incidencia');
    }
  }

  // Exponer incidencias para la plantilla
  incidenciasDelChecklist = computed(() => this.incidenciasChecklistActual());

  getEstadoBadge(todoOk: boolean): string {
    return todoOk ? 'green' : 'red';
  }

  getEstadoTexto(todoOk: boolean): string {
    return todoOk ? 'Completado' : 'Con problemas';
  }

  formatFecha(fecha: string): string {
    return new Date(fecha).toLocaleString('es-MX');
  }

  puedeAdministrar(): boolean {
    const rol = this.authSvc.proyectoActivo()?.rolEnProyecto;
    return rol === 'Gerente' || rol === 'Supervisor';
  }

  arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}