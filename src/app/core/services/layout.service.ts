import { Injectable, signal } from '@angular/core';

// ── Acción de botón en el subheader ───────────────────────────────────────────
export interface SubheaderAction {
  label: string;
  icon?: string;
  variant: 'flat' | 'stroked' | 'icon';
  color?: 'primary' | 'warn';
  handler: () => void;
}

// ── Filtro dinámico (select, date, text) ──────────────────────────────────────
export interface FilterConfig {
  type: 'text' | 'select' | 'date';
  key: string;
  placeholder?: string;
  options?: { label: string; value: string }[];
  defaultValue?: string | null;
}

// ── Configuración completa del subheader ──────────────────────────────────────
export interface SubheaderConfig {
  // Título de la página
  title?: string;

  subtitle?: string;

  // Barra de búsqueda principal
  showSearch?: boolean;
  searchPlaceholder?: string;

  // Botón "Agregar" a la derecha
  showAddButton?: boolean;
  addButtonLabel?: string;
  addHandler?: () => void;

  // Dropdown "Exportar" a la derecha
  showExport?: boolean;
  exportHandlers?: {
    excel?: () => void;
    pdf?:   () => void;
  };

  // Filtros dinámicos (select / date / text) junto a la búsqueda
  filters?: FilterConfig[];

  // Botones de acción inline (Buscar, Limpiar, etc.)
  actions?: SubheaderAction[];
}

// ─────────────────────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class LayoutService {

  // ── Estado de la barra lateral ────────────────────────────────────────────
  readonly sidebarCollapsed = signal(false);

  // ── Subheader ─────────────────────────────────────────────────────────────
  readonly subheaderConfig  = signal<SubheaderConfig>({ title: '' });

  // ── Búsqueda global ───────────────────────────────────────────────────────
  readonly searchValue      = signal('');

  // ── Filtros dinámicos y sus valores ──────────────────────────────────────
  readonly subheaderFilters = signal<FilterConfig[]>([]);
  readonly filterValues     = signal<Record<string, string>>({});

  // ── Control de modal (cierra el sidenav mientras hay un modal abierto) ───
  readonly modalOpen = signal(false);

  /** Duración de la animación del mat-sidenav (debe coincidir con el CSS). */
  private readonly SIDENAV_TRANSITION_MS = 200;

  private _filters = signal<FilterConfig[]>([]);

  // ── API pública ───────────────────────────────────────────────────────────

  /**
   * Actualiza el subheader con la configuración dada.
   * Se puede llamar tanto desde las rutas (data.subheader) como
   * directamente desde los componentes (para registrar handlers).
   */
  setSubheader(config: Partial<SubheaderConfig>): void {
    this.subheaderConfig.update(c => ({ ...c, ...config }));

    const filters = config.filters ?? [];
    this.subheaderFilters.set(filters);

    const initialValues: Record<string, string> = {};

    filters.forEach(f => {
      if (f.defaultValue != null) {
        initialValues[f.key] = f.defaultValue;
      }
    });

    this.filterValues.set(initialValues);
  }

  /** Restaura el subheader a su estado vacío y limpia la búsqueda. */
  resetSubheader(): void {
    this.subheaderConfig.set({ title: '' });
    this.subheaderFilters.set([]);
    this.filterValues.set({});
    this.searchValue.set('');
  }

  /** Alias para actualizar el valor de búsqueda desde cualquier componente. */
  onSearchInput(value: string): void {
    this.searchValue.set(value);
  }

  /**
   * Cierra el sidenav completamente (para dar espacio a un modal full-width).
   * Devuelve una Promise que resuelve tras la animación de cierre.
   */
  openModal(): Promise<void> {
    this.modalOpen.set(true);
    return new Promise(resolve =>
      setTimeout(resolve, this.SIDENAV_TRANSITION_MS)
    );
  }

  /** Reabre el sidenav tras cerrar el modal. */
  closeModal(): void {
    this.modalOpen.set(false);
  }
}