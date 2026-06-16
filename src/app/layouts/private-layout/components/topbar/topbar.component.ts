import {
  Component,
  EventEmitter,
  Output,
  inject,
  signal,
  OnDestroy,
  computed
} from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AuthService } from '../../../../core/auth/auth.service';
import { UpperCasePipe } from '@angular/common';
import { ProjectSwitcherDialogComponent } from './components/project-switcher-dialog/project-switcher-dialog.component';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDialogModule,
    UpperCasePipe
  ],
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.scss']
})
export class TopbarComponent implements OnDestroy {
  @Output() toggleSidenav = new EventEmitter<void>();

  currentTime = signal('');
  private clockInterval?: ReturnType<typeof setInterval>;

  private readonly dialog = inject(MatDialog);
  readonly authService    = inject(AuthService);

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

  readonly userName       = computed(() => this.authService.nombreUsuario() || 'Usuario');
  readonly proyectoActivo = computed(() => this.authService.proyectoActivo());
  readonly projectName    = computed(() => this.proyectoActivo()?.nombre ?? '');

  /** Muestra el botón de cambio sólo cuando hay más de un proyecto accesible. */
  readonly hasMultipleProjects = computed(
    () => this.authService.proyectosAccesibles().length > 1
  );

  abrirSelectorProyecto(): void {
    this.dialog.open(ProjectSwitcherDialogComponent, {
      panelClass:   'project-switcher-overlay',
      maxWidth:     '460px',
      width:        '100%',
      disableClose: false,
      autoFocus:    '#proyectoSelect'
    });
  }

  logout(): void {
    this.authService.logout();
  }
}