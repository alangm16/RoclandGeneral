import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { LayoutService } from '../../../../../core/services/layout.service';
import { SuperadminService } from '../../../services/super-admin.service';
import { AuthService } from '../../../../../core/auth/auth.service';
import { AlertService } from '../../../../../shared/components/swal-alert/alert.service';
import { ConfiguracionSistemaDto } from '../../../models/superadmin.models';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './configuracion.component.html',
  styleUrls: ['./configuracion.component.scss']
})
export class ConfiguracionComponent implements OnInit, OnDestroy {
  private layoutSvc = inject(LayoutService);
  private saSvc = inject(SuperadminService);
  private fb = inject(FormBuilder);
  private alert = inject(AlertService);
  private authSvc = inject(AuthService);
  private destroy$ = new Subject<void>();

  // Permisos (solo SuperAdmin puede editar)
  puedeEditar = computed(() => {
    const rol = this.authSvc.proyectoActivo()?.rolEnProyecto;
    return rol === 'SuperAdmin';
  });

  cargando = signal(false);
  configuracionForm: FormGroup;

  constructor() {
    this.configuracionForm = this.fb.group({
      maxIntentosFallidos: [5, [Validators.required, Validators.min(1), Validators.max(20)]],
      minutosBloqueo: [15, [Validators.required, Validators.min(1), Validators.max(1440)]],
      expiracionRefreshTokenHoras: [720, [Validators.required, Validators.min(1), Validators.max(8760)]],
      expiracionAccessTokenMinutos: [60, [Validators.required, Validators.min(5), Validators.max(1440)]],
      requiereQRParaMobile: [false, Validators.required]
    });
  }

  ngOnInit(): void {
    this.layoutSvc.setSubheader({
      title: 'Configuración del Sistema',
    //   showBackButton: true,
    //   backRoute: '/private/super-admin/dashboard'
    });

    this.cargarConfiguracion();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.layoutSvc.resetSubheader();
  }

  private cargarConfiguracion(): void {
    this.cargando.set(true);
    this.saSvc.getConfiguracion()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (config: ConfiguracionSistemaDto) => {
          this.configuracionForm.patchValue({
            maxIntentosFallidos: config.maxIntentosFallidos,
            minutosBloqueo: config.minutosBloqueo,
            expiracionRefreshTokenHoras: config.expiracionRefreshTokenHoras,
            expiracionAccessTokenMinutos: config.expiracionAccessTokenMinutos,
            requiereQRParaMobile: config.requiereQRParaMobile
          });
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.alert.error('No se pudo cargar la configuración del sistema');
        }
      });
  }

  async guardarConfiguracion(): Promise<void> {
    if (!this.puedeEditar()) {
      this.alert.error('No tiene permisos para modificar la configuración');
      return;
    }
    if (this.configuracionForm.invalid) {
      this.alert.advertencia('Corrija los errores en el formulario antes de guardar');
      return;
    }

    const confirmado = await this.alert.confirmarEditar('la configuración del sistema');
    if (!confirmado) return;

    const dto: ConfiguracionSistemaDto = this.configuracionForm.getRawValue();
    this.cargando.set(true);
    this.saSvc.updateConfiguracion(dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.cargando.set(false);
          this.alert.exito('Configuración actualizada correctamente');
        },
        error: () => {
          this.cargando.set(false);
          this.alert.error('No se pudo actualizar la configuración');
        }
      });
  }

  resetForm(): void {
    this.cargarConfiguracion();
    this.alert.info('Formulario restablecido a la configuración guardada');
  }
}