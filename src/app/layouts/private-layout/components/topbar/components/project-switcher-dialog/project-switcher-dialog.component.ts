// project-switcher-dialog.component.ts
import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { AuthService } from '../../../../../../core/auth/auth.service';
import { ProyectoAcceso } from '../../../../../../core/auth/auth.models';

@Component({
  selector: 'app-project-switcher-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule],
  templateUrl: './project-switcher-dialog.component.html',
  styleUrls: ['./project-switcher-dialog.component.scss']
})
export class ProjectSwitcherDialogComponent {
  private readonly auth    = inject(AuthService);
  private readonly router  = inject(Router);
  private readonly dialogRef = inject(MatDialogRef<ProjectSwitcherDialogComponent>);

  readonly proyectos     = computed(() => this.auth.proyectosAccesibles());
  readonly proyectoActivo = computed(() => this.auth.proyectoActivo());
  readonly userName      = computed(() => this.auth.nombreUsuario() || 'Usuario');

  // Proyecto seleccionado en el select (arranca con el activo)
  selectedCodigo = this.auth.proyectoActivo()?.codigo ?? null;

  loading  = signal(false);
  errorMsg = signal('');
  submitted = false;

  get botonDeshabilitado(): boolean {
    return this.loading() || !this.selectedCodigo;
  }

  get mismoProyecto(): boolean {
    return this.selectedCodigo === this.proyectoActivo()?.codigo;
  }

  confirmar(): void {
    this.submitted = true;
    this.errorMsg.set('');

    if (!this.selectedCodigo || this.mismoProyecto) {
      this.dialogRef.close();
      return;
    }

    this.loading.set(true);

    this.auth.cambiarProyecto(this.selectedCodigo).subscribe({
      next: () => {
        this.loading.set(false);
        const proyecto = this.auth.proyectoActivo();
        this.dialogRef.close(true);
        if (proyecto) {
          this.router.navigateByUrl(`/private/${proyecto.codigo}/dashboard`);
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(
          err?.error?.mensaje || 'No se pudo cambiar el módulo. Intenta de nuevo.'
        );
      }
    });
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}