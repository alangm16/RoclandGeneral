import { Component, OnInit, OnDestroy, inject, signal, Injector, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, combineLatest } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { LayoutService } from '../../../../../core/services/layout.service';
import { TruckCheckService } from '../../../services/truckcheck-services';
import { AlertService } from '../../../../../shared/components/swal-alert/alert.service';
import { DataTableComponent, DataTableColumn } from '../../../../../shared/components/data-table/data-table.component';
import { ModalComponent } from '../../../../../shared/components/modal/modal.component';
import { BadgeComponent } from '../../../../../shared/components/badge/badge-component';
import {
  ChecklistHistorialResponse,
  ChecklistDetalleResponse,
  FiltroChecklistRequest,
  SucursalResponse,
  VehiculoResponse,
  ChoferResponse
} from '../../../models/truckcheck.models';


@Component({
  selector: 'app-historial-checklist',
  standalone: true,
  imports: [CommonModule, DataTableComponent, ModalComponent, BadgeComponent],
  templateUrl: './historial.component.html',
  styleUrls: ['./historial.component.scss']
})
export class HistorialChecklistComponent implements OnInit, OnDestroy {
  private layoutSvc = inject(LayoutService);
  private truckSvc = inject(TruckCheckService);
  private alert = inject(AlertService);
  private injector = inject(Injector);
  private sanitizer = inject(DomSanitizer);
  private destroy$ = new Subject<void>();

  @ViewChild('truckDamageIframe') truckDamageIframe!: ElementRef<HTMLIFrameElement>;

  registros = signal<ChecklistHistorialResponse[]>([]);
  totalRegistros = signal(0);
  cargando = signal(false);
  paginaActual = signal(1);
  readonly porPagina = 15;
  totalPaginas = signal(1);
  modalAbierto = signal(false);
  detalleSeleccionado = signal<ChecklistDetalleResponse | null>(null);
  cargandoDetalle = signal(false);
  dropdownAbierto = signal<number | null>(null);

  sucursales = signal<SucursalResponse[]>([]);
  vehiculos = signal<VehiculoResponse[]>([]);
  choferes = signal<ChoferResponse[]>([]);

  columnas: DataTableColumn[] = [
    { key: 'fechaHoraLocal', label: 'FECHA' },
    { key: 'tipoRegistro', label: 'TIPO' },
    { key: 'sucursal', label: 'SUCURSAL' },
    { key: 'placas', label: 'PLACAS' },
    { key: 'nombreChofer', label: 'CHOFER' },
    { key: 'guardia', label: 'GUARDIA' },
    { key: 'acciones', label: '', cellClass: 'text-end' }
  ];

  ngOnInit(): void {
    this.configurarSubheader();
    this.cargarCatalogosFiltros();
    combineLatest([
      toObservable(this.layoutSvc.filterValues, { injector: this.injector }),
      toObservable(this.layoutSvc.searchValue, { injector: this.injector })
    ]).pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => { this.paginaActual.set(1); this.cargarHistorial(); });
    this.cargarHistorial();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.layoutSvc.resetSubheader();
  }

  toggleDropdown(event: Event, id: number): void {
    event.stopPropagation();
    this.dropdownAbierto.set(this.dropdownAbierto() === id ? null : id);
  }

  cerrarDropdown(id?: number): void {
    if (id === undefined || this.dropdownAbierto() === id) this.dropdownAbierto.set(null);
  }

  private configurarSubheader(): void {
    this.layoutSvc.setSubheader({
      title: 'Checklists',
      showSearch: true,
      searchPlaceholder: 'Buscar por placas o chofer...',
      filters: [
        { type: 'select', key: 'tipoRegistro', placeholder: 'Todos los tipos', options: [{ label: 'Entrada', value: 'Entrada' }, { label: 'Salida', value: 'Salida' }] },
        { type: 'date', key: 'fechaInicio', placeholder: 'Desde' },
        { type: 'date', key: 'fechaFin', placeholder: 'Hasta' },
        { type: 'select', key: 'idSucursal', placeholder: 'Todas las sucursales', options: [] },
        { type: 'select', key: 'idVehiculo', placeholder: 'Todas las placas', options: [] },
        { type: 'select', key: 'idChofer', placeholder: 'Todos los choferes', options: [] }
      ],
      actions: [
        { label: 'Buscar', icon: 'bi-search', variant: 'flat', handler: () => this.ejecutarBusqueda() },
        { label: 'Limpiar', icon: 'bi-arrow-counterclockwise', variant: 'stroked', handler: () => this.limpiarFiltros() }
      ]
    });
  }

  private cargarCatalogosFiltros(): void {
    this.truckSvc.getSucursales().pipe(takeUntil(this.destroy$)).subscribe({
      next: (s) => { this.sucursales.set(s); this.actualizarOpcionesFiltro('idSucursal', s.map(s => ({ label: s.nombre as string, value: s.id.toString() }))); },
      error: () => console.error('Error cargando sucursales')
    });
    this.truckSvc.getVehiculos().pipe(takeUntil(this.destroy$)).subscribe({
      next: (v) => { this.vehiculos.set(v); this.actualizarOpcionesFiltro('idVehiculo', v.map(v => ({ label: v.placas, value: v.id.toString() }))); },
      error: () => console.error('Error cargando vehículos')
    });
    this.truckSvc.getChoferes().pipe(takeUntil(this.destroy$)).subscribe({
      next: (c) => { this.choferes.set(c); this.actualizarOpcionesFiltro('idChofer', c.map(c => ({ label: c.nombre, value: c.id.toString() }))); },
      error: () => console.error('Error cargando choferes')
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
    const filtro: FiltroChecklistRequest = {
      pagina: this.paginaActual(),
      registrosPorPagina: this.porPagina,
      fechaInicio: raw['fechaInicio'] || undefined,
      fechaFin: raw['fechaFin'] || undefined,
      tipoRegistro: raw['tipoRegistro'] || undefined,
      idSucursal: raw['idSucursal'] ? +raw['idSucursal'] : undefined,
      idVehiculo: raw['idVehiculo'] ? +raw['idVehiculo'] : undefined,
      idChofer: raw['idChofer'] ? +raw['idChofer'] : undefined,
    };
    if (search) {
      filtro.nombreChofer = search;
      const match = this.vehiculos().find(v => v.placas.toLowerCase() === search.toLowerCase());
      if (match) filtro.idVehiculo = match.id;
    }
    this.truckSvc.getChecklistHistorial(filtro).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.registros.set(res.items);
        this.totalRegistros.set(res.totalRegistros);
        this.totalPaginas.set(res.totalPaginas);
        this.cargando.set(false);
      },
      error: () => { this.cargando.set(false); this.alert.error('Error al cargar el historial'); }
    });
  }

  cambiarPagina(delta: number): void {
    const nueva = this.paginaActual() + delta;
    if (nueva >= 1 && nueva <= this.totalPaginas()) {
      this.paginaActual.set(nueva);
      this.cargarHistorial();
    }
  }

  ejecutarBusqueda(): void { this.paginaActual.set(1); this.cargarHistorial(); }
  limpiarFiltros(): void { this.layoutSvc.searchValue.set(''); this.layoutSvc.filterValues.set({}); this.paginaActual.set(1); this.cargarHistorial(); }

  verDetalle(id: number): void {
    this.cargandoDetalle.set(true);
    this.modalAbierto.set(true);
    this.truckSvc.getChecklistDetallePorId(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (detalle) => {
        this.detalleSeleccionado.set(detalle);
        this.cargandoDetalle.set(false);
        this.inyectarDaniosEnIframe(detalle.daniosReportados ?? []);
      },
      error: () => {
        this.cargandoDetalle.set(false);
        this.alert.error('No se pudo cargar el detalle');
        this.modalAbierto.set(false);
      }
    });
  }

  private inyectarDaniosEnIframe(danios: { id: number; nombreZona: string; notas?: string }[]): void {
    const iframe = this.truckDamageIframe?.nativeElement;
    if (!iframe) {
      setTimeout(() => this.inyectarDaniosEnIframe(danios), 200);
      return;
    }

    const enviar = () => {
      if (iframe.contentWindow && (iframe.contentWindow as any).setDamagesJson) {
        const json = JSON.stringify(danios.map(d => ({ IdZonaDanio: d.id, Notas: d.notas ?? null })));
        try {
          (iframe.contentWindow as any).setDamagesJson(json);
          // Forzar un refresco adicional por si acaso
          setTimeout(() => {
            if ((iframe.contentWindow as any).refresh) {
              (iframe.contentWindow as any).refresh();
            }
          }, 100);
          console.log('✅ Daños inyectados correctamente:', danios);
        } catch (e) {
          console.warn('Error inyectando daños', e);
        }
      } else {
        setTimeout(enviar, 200);
      }
    };

    if (iframe.contentWindow?.document.readyState === 'complete') {
      enviar();
    } else {
      iframe.addEventListener('load', enviar, { once: true });
    }
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
    this.detalleSeleccionado.set(null);
  }

  formatFecha(fecha: string): string {
    if (!fecha) return '—';
    const fechaUTC = new Date(fecha);
    const fechaLocal = new Date(fechaUTC.getTime() + (6 * 60 * 60 * 1000));
    return fechaLocal.toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  parsearNumero(valor: any): number {
    if (!valor) return 0;
    // Quita cualquier carácter que no sea un dígito o un punto decimal
    const num = parseFloat(valor.toString().replace(/[^0-9.-]+/g, ''));
    return isNaN(num) ? 0 : num;
  }

  /**
   * Retorna el código de color según el nivel de combustible (cuartos).
   * 0-24% Rojo | 25-49% Naranja | 50-74% Amarillo | 75-100% Verde
   */
  obtenerColorCombustible(valor: any): string {
    const v = this.parsearNumero(valor);
    if (v < 25) return '#E53935'; // Rojo
    if (v < 50) return '#FB8C00'; // Naranja
    if (v < 75) return '#FBC02D'; // Amarillo
    return '#43A047';             // Verde
  }
}