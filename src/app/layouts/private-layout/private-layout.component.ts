import { Component, inject, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatSidenavModule } from '@angular/material/sidenav';
import { map } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { SidebarComponent, NavItem } from './components/sidebar/sidebar.component';
import { TopbarComponent } from './components/topbar/topbar.component';
import { SubheaderComponent } from './components/subheader/subheader.component';
import { FooterComponent } from './components/footer/footer.component';
import { LayoutService } from '../../core/services/layout.service';
import { AuthService } from '../../core/auth/auth.service';

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
  readonly authService = inject(AuthService);
  
  readonly isHandset = toSignal(
    this.breakpointObserver.observe([
      Breakpoints.Handset,
      Breakpoints.TabletPortrait,
      '(max-width: 1024px)'
    ]).pipe(map(result => result.matches)),
    { initialValue: false }
  );
  
  navItems: NavItem[] = this.buildNavItems();
  
  private buildNavItems(): NavItem[] {
    const proyecto = this.authService.proyectoActual() || '';
    if (proyecto.includes('acceso-control')) {
    const base = '/private/acceso-control-web';
      return [
        { label: 'Dashboard',  icon: 'bi-speedometer2', route: `${base}/dashboard` },
        { label: 'Personas',   icon: 'bi-people',        route: `${base}/personas` },
        { label: 'Guardias',   icon: 'bi-shield-shaded', route: `${base}/guardias` },
        { label: 'Historial',  icon: 'bi-clock-history', route: `${base}/historial` },
        {
          label: 'Catálogos',
          icon: 'bi-gear',
          children: [
            { label: 'Empresas',              route: `${base}/catalogos/empresas` },
            { label: 'Visitantes frecuentes', route: `${base}/catalogos/visitantes` }
          ]
        }
      ];
    }
    return [{ label: 'Dashboard', icon: 'bi-speedometer2', route: '/dashboard' }];
  }
}