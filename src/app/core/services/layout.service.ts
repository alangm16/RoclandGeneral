import { Injectable, signal } from '@angular/core';

export interface SubheaderConfig {
  title: string;
  showSearch?: boolean;
  searchPlaceholder?: string;
  showAddButton?: boolean;
  showExport?: boolean;
  addButtonLabel?: string;

  actions?: SubheaderAction[];
}

export interface SubheaderAction {
  label: string;
  icon?: string;          // clase de bootstrap-icons, ej: 'bi-search'
  variant: 'flat' | 'stroked' | 'icon';
  color?: 'primary' | 'warn';
  handler: () => void;
}

@Injectable({ providedIn: 'root' })
export class LayoutService {
  readonly sidebarCollapsed = signal(false);
  
  // Mantenemos el valor inicial con solo el title vacío
  readonly subheaderConfig = signal<SubheaderConfig>({ title: '' });

  readonly searchValue = signal('');

  toggleSidebar() {
    this.sidebarCollapsed.update(v => !v);
  }

  setSubheader(config: Partial<SubheaderConfig>) {
    this.subheaderConfig.update(current => ({ ...current, ...config }));
  }

  // --- NUEVO MÉTODO: Resetea el subheader ---
  resetSubheader() {
    this.subheaderConfig.set({ title: '' }); 
  }
}