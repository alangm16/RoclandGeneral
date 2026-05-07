// src/app/layouts/private-layout/private-layout.component.ts
import { Component, inject, effect, viewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { map } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';

import { SidebarComponent } from './components/sidebar/sidebar.component';
import { TopbarComponent } from './components/topbar/topbar.component';
import { SubheaderComponent } from './components/subheader/subheader.component';
import { FooterComponent } from './components/footer/footer.component';
import { LayoutService } from '../../core/services/layout.service';

@Component({
  selector: 'app-private-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    MatSidenavModule,
    SidebarComponent,
    TopbarComponent,
    SubheaderComponent,
    FooterComponent
  ],
  templateUrl: './private-layout.component.html',
  styleUrls: ['./private-layout.component.scss']
})
export class PrivateLayoutComponent {
  private readonly breakpointObserver = inject(BreakpointObserver);
  readonly layoutService = inject(LayoutService);

  // Referencia al mat-sidenav del HTML
  private readonly sidenav = viewChild.required(MatSidenav);

  // Control responsivo: ¿Estamos en una pantalla pequeña?
  readonly isHandset = toSignal(
    this.breakpointObserver.observe([
      Breakpoints.Handset,
      Breakpoints.TabletPortrait,
      '(max-width: 1024px)'
    ]).pipe(map(result => result.matches)),
    { initialValue: false }
  );

  private sidenavWasOpen = false;

  constructor() {
    // Control automático de modales vs Sidebar
    effect(() => {
      const modalOpen = this.layoutService.modalOpen();
      const sidenavRef = this.sidenav();

      if (modalOpen) {
        this.sidenavWasOpen = sidenavRef.opened;
        sidenavRef.close();
      } else if (this.sidenavWasOpen && !this.isHandset()) {
        sidenavRef.open();
      }
    });
  }

  toggleSidenav(): void {
    this.sidenav().toggle();
  }
}