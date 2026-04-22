import { Injectable, signal } from '@angular/core';

export interface SubheaderConfig {
  title: string;
  showSearch?: boolean;
  showAddButton?: boolean;
  showExport?: boolean;
  addButtonLabel?: string;
}

@Injectable({ providedIn: 'root' })
export class LayoutService {
  readonly sidebarCollapsed = signal(false);
  
  // Mantenemos el valor inicial con solo el title vacío
  readonly subheaderConfig = signal<SubheaderConfig>({ title: '' });

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