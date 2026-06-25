import {
  Component,
  EventEmitter,
  Output,
  inject,
  signal,
  OnDestroy,
  computed
} from '@angular/core';
import { Router } from '@angular/router'; // Agregamos el Router
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
// Ya no necesitamos MatDialogModule ni ProjectSwitcherDialogComponent
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
  isSwitching = signal(false); // Nuevo: Estado para saber si está cargando el cambio
  private clockInterval?: ReturnType<typeof setInterval>;

  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

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

  // Obtenemos directamente del servicio el listado de proyectos
  readonly userName       = computed(() => this.authService.nombreUsuario() || 'Usuario');
  readonly proyectos      = computed(() => this.authService.proyectosAccesibles());
  readonly proyectoActivo = computed(() => this.authService.proyectoActivo());
  readonly projectName    = computed(() => this.proyectoActivo()?.nombre ?? '');

  readonly hasMultipleProjects = computed(
    () => this.proyectos().length > 1
  );

  /** Nueva función: Ejecuta el cambio de proyecto directamente en el header */
  cambiarProyecto(codigo: string): void {
    if (codigo === this.proyectoActivo()?.codigo) return;

    this.isSwitching.set(true);

    this.authService.cambiarProyecto(codigo).subscribe({
      next: () => {
        this.isSwitching.set(false);
        const proyecto = this.authService.proyectoActivo();
        if (proyecto) {
          // Redirigir al dashboard del nuevo proyecto seleccionado
          this.router.navigateByUrl(`/private/${proyecto.codigo}/dashboard`);
        }
      },
      error: (err) => {
        this.isSwitching.set(false);
        console.error('Error al cambiar de módulo', err);
        // Aquí podrías disparar tu servicio de alertas si lo deseas
      }
    });
  }

  logout(): void {
    this.authService.logout();
  }
}