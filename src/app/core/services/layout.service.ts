import { Injectable, signal } from '@angular/core';

export interface SubheaderAction {
  label: string;
  icon?: string;          // bootstrap-icons class, ej: 'bi-search'
  variant: 'flat' | 'stroked' | 'icon';
  color?: 'primary' | 'warn';
  handler: () => void;
}

export interface SubheaderConfig {
  title: string;
  showSearch?: boolean;
  searchPlaceholder?: string;
  showAddButton?: boolean;
  showExport?: boolean;
  addButtonLabel?: string;
  /** Acciones custom que se renderizan en subheader-right */
  actions?: SubheaderAction[];
}

@Injectable({ providedIn: 'root' })
export class LayoutService {
  readonly sidebarCollapsed = signal(false);

  readonly subheaderConfig = signal<SubheaderConfig>({ title: '' });

  /** Valor actual del input de búsqueda del subheader */
  readonly searchValue = signal('');

  toggleSidebar() {
    this.sidebarCollapsed.update(v => !v);
  }

  setSubheader(config: Partial<SubheaderConfig>) {
    this.subheaderConfig.update(current => ({ ...current, ...config }));
  }

  resetSubheader() {
    this.subheaderConfig.set({ title: '' });
    this.searchValue.set('');
  }

  /** Llamado desde el subheader al escribir en el input */
  onSearchInput(value: string) {
    this.searchValue.set(value);
  }
}