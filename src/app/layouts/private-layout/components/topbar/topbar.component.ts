import { Component, EventEmitter, Output, inject, signal, OnDestroy, computed } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../../../core/auth/auth.service';
import { UpperCasePipe } from '@angular/common';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    UpperCasePipe
  ],
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.scss']
})
export class TopbarComponent implements OnDestroy {
  @Output() toggleSidenav = new EventEmitter<void>();

  currentTime = signal('');
  private clockInterval?: ReturnType<typeof setInterval>;

  readonly authService = inject(AuthService);

  constructor() {
    this.updateClock();
    this.clockInterval = setInterval(() => this.updateClock(), 1000);
  }

  private updateClock(): void {
    const now = new Date();
    this.currentTime.set(
      now.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      })
    );
  }

  ngOnDestroy(): void {
    clearInterval(this.clockInterval);
  }

  readonly userName = computed(() => this.authService.nombreUsuario() || 'Usuario');
  readonly projectName = computed(() => 
  this.authService.proyectoActivo()?.nombre ?? 'Selecciona un proyecto'
);

  logout(): void {
    this.authService.logout();
  }
}