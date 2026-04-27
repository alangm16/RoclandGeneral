import { Injectable, signal } from '@angular/core';

export interface SubheaderAction {
  label: string;
  icon?: string;
  variant: 'flat' | 'stroked' | 'icon';
  color?: 'primary' | 'warn';
  handler: () => void;
}

export interface SubheaderConfig {
  title?: string;
  showSearch?: boolean;
  searchPlaceholder?: string;
  showExport?: boolean;
  showAddButton?: boolean;
  addButtonLabel?: string;
  addHandler?: () => void;
  actions?: SubheaderAction[];
}

@Injectable({ providedIn: 'root' })
export class LayoutService {
  readonly sidebarCollapsed = signal(false);
  readonly subheaderConfig   = signal<SubheaderConfig>({ title: '' });
  readonly searchValue       = signal('');

  /**
   * Cuando pasa a `true`, PrivateLayoutComponent cierra el sidenav de
   * Angular Material por completo (no solo lo estrecha a 68px).
   * Al volver a `false` lo reabre en el modo que corresponda.
   */
  readonly modalOpen = signal(false);

  /** Debe coincidir con la duración de animación del mat-sidenav. */
  private readonly SIDENAV_TRANSITION_MS = 200;

  setSubheader(config: Partial<SubheaderConfig>) {
    this.subheaderConfig.update(c => ({ ...c, ...config }));
  }

  resetSubheader() {
    this.subheaderConfig.set({ title: '' });
    this.searchValue.set('');
  }

  onSearchInput(value: string) {
    this.searchValue.set(value);
  }

  /**
   * Indica al layout que cierre el sidenav completamente.
   * Devuelve una Promise que resuelve tras la animación de cierre.
   */
  openModal(): Promise<void> {
    this.modalOpen.set(true);
    return new Promise(resolve =>
      setTimeout(resolve, this.SIDENAV_TRANSITION_MS)
    );
  }

  /**
   * Indica al layout que reabra el sidenav al cerrar el modal.
   */
  closeModal(): void {
    this.modalOpen.set(false);
  }
}