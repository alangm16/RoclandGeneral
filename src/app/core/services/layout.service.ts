import { Injectable, signal } from '@angular/core';

// 1. La interfaz de acciones debe estar exportada
export interface SubheaderAction {
  label: string;
  icon?: string;
  variant: 'flat' | 'stroked' | 'icon';
  color?: 'primary' | 'warn';
  handler: () => void;
}

export interface SubheaderConfig {
  title: string;
  showSearch?: boolean;
  searchPlaceholder?: string; // Asegúrate de que esta línea esté aquí
  showAddButton?: boolean;
  showExport?: boolean;
  addButtonLabel?: string;
  actions?: SubheaderAction[]; // Y esta también
}

@Injectable({ providedIn: 'root' })
export class LayoutService {
  readonly sidebarCollapsed = signal(false);
  readonly subheaderConfig = signal<SubheaderConfig>({ title: '' });
  readonly searchValue = signal(''); // Esta señal es vital para el buscador

  setSubheader(config: Partial<SubheaderConfig>) {
    this.subheaderConfig.update(current => ({ ...current, ...config }));
  }

  resetSubheader() {
    this.subheaderConfig.set({ title: '' });
    this.searchValue.set('');
  }

  onSearchInput(value: string) {
    this.searchValue.set(value);
  }
}