import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  Subject,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  takeUntil,
  finalize,
  of,
} from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import {
  ProyectoAcceso,
  LoginDirectoRequest,
} from '../../../core/auth/auth.models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit, OnDestroy {
  private readonly fb     = inject(FormBuilder);
  private readonly auth   = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route  = inject(ActivatedRoute);

  // ── Formulario con los 3 campos obligatorios ──────────────────────────────
  form: FormGroup = this.fb.group({
    usuario:    ['', [Validators.required, Validators.minLength(3)]],
    password:   ['', [Validators.required, Validators.minLength(4)]],
    proyectoId: [{ value: null, disabled: true }, Validators.required],
  });
  submitted   = false;
  loading     = false;
  buscando    = false;
  errorMsg    = '';
  mostrarPass = false;

  proyectos: ProyectoAcceso[] = [];

  private readonly destroy$ = new Subject<void>();
  readonly year = new Date().getFullYear();

  // ── Ciclo de vida ──────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.auth.limpiarSesionExpirada();
    if (this.auth.estaLogueado()) {
      this.navegarPostLogin();
      return;
    }

    // Cada vez que cambia el campo "usuario" buscamos los proyectos disponibles
    this.form.get('usuario')!.valueChanges.pipe(
      takeUntil(this.destroy$),
      debounceTime(400),
      distinctUntilChanged(),
      switchMap((username: string) => {
        // Resetear selector de proyectos
        this.proyectos = [];
        this.form.get('proyectoId')!.setValue(null, { emitEvent: false });

        if (!username || username.trim().length < 3) {
          this.buscando = false;
          return of([]);
        }

        this.buscando = true;
        return this.auth.descubrirProyectos(username.trim()).pipe(
          finalize(() => (this.buscando = false))
        );
        
      })
    ).subscribe({
      next: (proyectos) => {
        this.proyectos = proyectos;

        const ctrl = this.form.get('proyectoId')!;

        if (proyectos.length === 0) {
          ctrl.disable({ emitEvent: false });
        } else {
          ctrl.enable({ emitEvent: false });
          if (proyectos.length === 1) {
            ctrl.setValue(proyectos[0].id, { emitEvent: false });
          }
        }
      },
      error: () => (this.buscando = false),
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Helpers de template ───────────────────────────────────────────────────
  get botonDeshabilitado(): boolean {
    return this.loading || this.buscando || this.form.invalid;
  }

  isInvalid(campo: string): boolean {
    const ctrl = this.form.get(campo);
    return !!(this.submitted && ctrl?.invalid);
  }

  togglePass(): void {
    this.mostrarPass = !this.mostrarPass;
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  onSubmit(): void {
    this.submitted = true;
    this.errorMsg  = '';

    if (this.form.invalid) return;

    const { usuario, password, proyectoId } = this.form.value;

    // Encontrar el proyecto seleccionado por su id
    const proyecto = this.proyectos.find((p) => p.id === +proyectoId);
    if (!proyecto) {
      this.errorMsg = 'Selecciona un módulo válido.';
      return;
    }

    this.loading = true;

    const creds: LoginDirectoRequest = {
      username:        usuario,
      password,
      codigoProyecto:  proyecto.codigo,
      plataforma:      'Web',
    };

    this.auth.loginDirecto(creds).subscribe({
      next: () => {
        this.loading = false;
        this.navegarPostLogin();
      },
      error: (err) => this.manejarError(err),
    });
  }

  // ── Navegación post-login ─────────────────────────────────────────────────
  private navegarPostLogin(): void {
    const returnUrl = this.route.snapshot.queryParams['returnUrl'];
    const proyecto  = this.auth.proyectoActivo();

    if (proyecto) {
      this.router.navigateByUrl(returnUrl || `/private/${proyecto.codigo}/dashboard`);
    } else {
      this.router.navigateByUrl(returnUrl || '/private/super-admin/dashboard');
    }
  }

  // ── Manejo de errores HTTP ────────────────────────────────────────────────
  private manejarError(err: any): void {
    this.loading = false;
    if (err.status === 401 || err.status === 400) {
      this.errorMsg = 'Usuario o contraseña incorrectos.';
    } else if (err.status === 0) {
      this.errorMsg = 'No se pudo conectar con el servidor.';
    } else {
      this.errorMsg = err?.error?.mensaje || 'Error al iniciar sesión.';
    }
  }
  
}