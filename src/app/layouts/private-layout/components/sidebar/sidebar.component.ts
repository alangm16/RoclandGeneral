import { Component, Input, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { NgClass } from '@angular/common';
import { LayoutService } from '../../../../core/services/layout.service';
import { AuthService } from '../../../../core/auth/auth.service';

export interface NavItem {
  label: string;
  icon?: string;
  route?: string;
  children?: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    RouterModule,
    MatListModule,
    MatExpansionModule,
    MatIconModule,
    NgClass
  ],
  templateUrl: 'sidebar.component.html',
  styleUrls: ['sidebar.component.scss']
})
export class SidebarComponent {
  @Input() navItems: NavItem[] = [];
  
  readonly layoutService = inject(LayoutService);
  readonly authService = inject(AuthService);
  
  get userName(): string {
    return this.authService.nombreUsuario() || 'Usuario';
  }
  
  get userRole(): string {
    return this.authService.rolActual() || 'Sin rol';
  }
  
  logout(): void {
    this.authService.logout();
  }
}