import {
  Component, OnInit, OnDestroy, inject, signal, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { LayoutService } from '../../../../../core/services/layout.service';
import { environment } from '../../../../../../environmets/Environment';

// ── Modelos ────────────────────────────────────────────────────────────────

export interface PersonaResumen {
  id: number;
  nombre: string;
  numeroIdentificacion: string;
  tipoID: string;
  empresa?: string;
  totalVisitas: number;
  fechaUltimaVisita?: string;
}

export interface PersonaPerfil extends PersonaResumen {
  telefono?: string;
  fechaRegistro: string;
}

export interface HistorialItem {
  tipo: 'Visitante' | 'Proveedor';
  area?: string;
  empresa?: string;
  motivo: string;
  fechaEntrada: string;
  fechaSalida?: string;
  minutosEstancia?: number;
  estadoAcceso: 'Aprobado' | 'Salido' | 'Rechazado' | 'Pendiente';
}

// ── Componente ─────────────────────────────────────────────────────────────

@Component({
  selector: 'app-personas',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './personas.component.html',
  styleUrls: ['./personas.component.scss'],
})
export class PersonasComponent implements OnInit, OnDestroy {

  private readonly http      = inject(HttpClient);
  private readonly layoutSvc = inject(LayoutService);
  private readonly destroy$  = new Subject<void>();
  private readonly apiBase   = `${environment.apiUrl}/api/web/accesocontrol/admin`;

  // ── Estado tabla ──────────────────────────────────────────────────────
  personas      = signal<PersonaResumen[]>([]);
  totalPersonas = signal(0);
  cargando      = signal(false);
  errorMsg      = signal<string | null>(null);

  // ── Paginación ────────────────────────────────────────────────────────
  paginaActual  = signal(1);
  readonly porPagina = 10;

  totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.totalPersonas() / this.porPagina))
  );

  paginas = computed<(number | '...')[]>(() => {
    const total  = this.totalPaginas();
    const actual = this.paginaActual();
    const out: (number | '...')[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) out.push(i);
    } else {
      out.push(1);
      if (actual > 3)           out.push('...');
      for (let i = Math.max(2, actual - 1); i <= Math.min(total - 1, actual + 1); i++) out.push(i);
      if (actual < total - 2)   out.push('...');
      out.push(total);
    }
    return out;
  });

  // ── Panel detalle ─────────────────────────────────────────────────────
  perfil          = signal<PersonaPerfil | null>(null);
  historial       = signal<HistorialItem[]>([]);
  cargandoDetalle = signal(false);
  panelAbierto    = signal(false);

  // ── Lifecycle ─────────────────────────────────────────────────────────

  ngOnInit(): void {
    // Registrar título + búsqueda + botones en el subheader
    this.layoutSvc.setSubheader({
      title: 'Personas',
      showSearch: true,
      searchPlaceholder: 'Buscar por nombre o número de ID...',
      actions: [
        {
          label: 'Buscar',
          icon: 'bi-search',
          variant: 'flat',
          color: 'primary',
          handler: () => this.ejecutarBusqueda(),
        },
        {
          label: 'Limpiar',
          icon: 'bi-arrow-counterclockwise',
          variant: 'stroked',
          handler: () => this.limpiarBusqueda(),
        },
      ],
    });

    // Escuchar cambios en el input de búsqueda del subheader con debounce
    toObservable(this.layoutSvc.searchValue)
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.paginaActual.set(1);
        this.cargarPersonas();
      });

    this.cargarPersonas();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.layoutSvc.resetSubheader();
  }

  // ── Handlers de subheader ─────────────────────────────────────────────

  private ejecutarBusqueda(): void {
    this.paginaActual.set(1);
    this.cargarPersonas();
  }

  private limpiarBusqueda(): void {
    this.layoutSvc.onSearchInput('');
    this.paginaActual.set(1);
    this.cerrarDetalle();
    this.cargarPersonas();
  }

  // ── Paginación ────────────────────────────────────────────────────────

  irPagina(p: number | '...'): void {
    if (p === '...' || p === this.paginaActual()) return;
    this.paginaActual.set(p as number);
    this.cargarPersonas();
  }

  paginaAnterior(): void {
    if (this.paginaActual() > 1) {
      this.paginaActual.update(n => n - 1);
      this.cargarPersonas();
    }
  }

  paginaSiguiente(): void {
    if (this.paginaActual() < this.totalPaginas()) {
      this.paginaActual.update(n => n + 1);
      this.cargarPersonas();
    }
  }

  esPaginaNumero(p: number | '...'): p is number {
    return typeof p === 'number';
  }

  // ── Detalle ───────────────────────────────────────────────────────────

  async verDetalle(persona: PersonaResumen): Promise<void> {
    if (this.perfil()?.id === persona.id && this.panelAbierto()) {
      this.cerrarDetalle();
      return;
    }

    this.panelAbierto.set(true);
    this.cargandoDetalle.set(true);
    this.perfil.set(null);
    this.historial.set([]);

    try {
      const [p, h] = await Promise.all([
        this.http.get<PersonaPerfil>(`${this.apiBase}/personas/${persona.id}`).toPromise(),
        this.http.get<HistorialItem[]>(`${this.apiBase}/personas/${persona.id}/historial`).toPromise(),
      ]);
      this.perfil.set(p ?? null);
      this.historial.set(h ?? []);
    } catch {
      this.errorMsg.set('No se pudo cargar el detalle.');
    } finally {
      this.cargandoDetalle.set(false);
    }

    setTimeout(() =>
      document.getElementById('panel-detalle')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80
    );
  }

  cerrarDetalle(): void {
    this.panelAbierto.set(false);
    this.perfil.set(null);
    this.historial.set([]);
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  rangoActual(): string {
    const desde = (this.paginaActual() - 1) * this.porPagina + 1;
    const hasta  = Math.min(this.paginaActual() * this.porPagina, this.totalPersonas());
    return `${desde}–${hasta} de ${this.totalPersonas()}`;
  }

  fmtFecha(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('es-MX', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  }

  fmtDuracion(min?: number | null): string {
    if (min == null) return '—';
    if (min < 60) return `${min} m`;
    const h = Math.floor(min / 60);
    const r = min % 60;
    return r === 0 ? `${h} h` : `${h} h ${r} m`;
  }

  badgeTipo(tipo: string): string {
    return tipo === 'Visitante' ? 'badge-blue' : 'badge-purple';
  }

  badgeEstado(estado: string): string {
    const m: Record<string, string> = {
      Aprobado: 'badge-green', Salido: 'badge-green',
      Rechazado: 'badge-red',  Pendiente: 'badge-amber',
    };
    return m[estado] ?? 'badge-gray';
  }

  inicial(nombre: string): string {
    return nombre?.charAt(0)?.toUpperCase() ?? '?';
  }

  // ── Carga de datos ────────────────────────────────────────────────────

  private cargarPersonas(): void {
    this.cargando.set(true);
    this.errorMsg.set(null);

    let params = new HttpParams()
      .set('page',     this.paginaActual().toString())
      .set('pageSize', this.porPagina.toString());

    const busqueda = this.layoutSvc.searchValue().trim();
    if (busqueda) params = params.set('busqueda', busqueda);

    this.http
      .get<{ items: PersonaResumen[]; total: number }>(`${this.apiBase}/personas`, { params })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ items, total }) => {
          this.personas.set(items);
          this.totalPersonas.set(total);
          this.cargando.set(false);
        },
        error: () => {
          this.errorMsg.set('Error al cargar personas. Intenta de nuevo.');
          this.cargando.set(false);
        },
      });
  }
}