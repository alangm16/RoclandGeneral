// login.component.ts
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { ProyectoPermitido } from '../../../core/auth/auth.models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl:    './login.component.scss',
})
export class LoginComponent implements OnInit, OnDestroy {
  private readonly fb     = inject(FormBuilder);
  private readonly auth   = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route  = inject(ActivatedRoute);

  // ── Estado ────────────────────────────────────────────────────
  form!:      FormGroup;
  submitted   = false;
  loading     = false;
  buscando    = false;
  errorMsg    = '';
  mostrarPass = false;

  // ── Proyectos ─────────────────────────────────────────────────
  proyectos: ProyectoPermitido[] = [];
  proyectoSeleccionado: ProyectoPermitido | null = null;
  
  private destroy$ = new Subject<void>();
  readonly year = new Date().getFullYear();

  // ── Lifecycle ─────────────────────────────────────────────────
  ngOnInit(): void {
    this.buildForm();

    if (this.auth.estaLogueado()) {
      this.navegarPostLogin(this.auth.proyectoActual());
      return;
    }

    // Escuchamos el teclado en el campo de usuario
    this.form.get('usuario')?.valueChanges.pipe(
      debounceTime(500), 
      distinctUntilChanged(), 
      takeUntil(this.destroy$)
    ).subscribe(username => {
      if (username && username.length >= 3) {
        this.buscarProyectosDinamicamente(username);
      } else {
        this.limpiarProyectos();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Formulario ────────────────────────────────────────────────
  private buildForm(): void {
    this.form = this.fb.group({
      usuario:    ['', [Validators.required, Validators.minLength(3)]],
      password:   ['', [Validators.required, Validators.minLength(4)]],
      proyectoId: ['', [Validators.required]],
    });
  }

  // ── Descubrimiento Automático ─────────────────────────────────
  private buscarProyectosDinamicamente(username: string): void {
    this.buscando = true;
    this.auth.descubrirProyectos(username).subscribe({
      next: (res) => {
        // 👇 FIX: Filtramos estrictamente para mostrar SOLO proyectos Web
        this.proyectos = res.filter(p => p.plataforma && p.plataforma.toLowerCase() === 'web');
        this.buscando = false;

        if (this.proyectos.length === 1) {
          this.seleccionarProyecto(this.proyectos[0].codigo);
        } else {
          this.form.get('proyectoId')?.setValue('');
          this.proyectoSeleccionado = null;
        }
      },
      error: () => {
        this.limpiarProyectos();
        this.buscando = false;
      }
    });
  }

  private limpiarProyectos(): void {
    this.proyectos = [];
    this.proyectoSeleccionado = null;
    this.form.get('proyectoId')?.setValue('');
  }

  // ── Selección y Navegación ────────────────────────────────────
  
  // Se llama cuando el usuario cambia el Dropdown manualmente en el HTML
  onProyectoChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    this.seleccionarProyecto(selectElement.value);
  }

  seleccionarProyecto(codigo: string): void {
    this.proyectoSeleccionado = this.proyectos.find(p => p.codigo === codigo) ?? null;
    this.form.get('proyectoId')?.setValue(codigo);
    this.errorMsg = '';
  }

  private navegarPostLogin(proyectoCodigo: string): void {
    const returnUrl = this.route.snapshot.queryParams['returnUrl'];
    const esRutaInterna = typeof returnUrl === 'string' && returnUrl.startsWith('/');
    const destino = esRutaInterna ? returnUrl : `/private/${proyectoCodigo}/dashboard`;
    this.router.navigateByUrl(destino);
  }

  // ── Submit ────────────────────────────────────────────────────
  onSubmit(): void {
    this.submitted = true;
    this.errorMsg  = '';

    if (this.form.invalid || !this.proyectoSeleccionado) return;

    this.loading = true;

    const credenciales = {
      username: this.form.value.usuario, 
      password: this.form.value.password,
      plataforma: 'Web'
    };

    this.auth.login(credenciales, this.proyectoSeleccionado).subscribe({
      next: () => {
        this.navegarPostLogin(this.proyectoSeleccionado!.codigo);
      },
      error: (err) => {
        this.loading = false;
        this.auth.logout();

        if (err.message === 'NO_PROJECT_ACCESS') {
          this.errorMsg = 'No tienes permiso para acceder a este proyecto.';
        } else if (err.message === 'NO_MODULE_PROFILE') {
          this.errorMsg = 'Tu usuario no tiene un perfil configurado en Control de Acceso.';
        } else if (err.message === 'NO_MODULE_ROLE') {
          this.errorMsg = 'Requieres permisos de Supervisor para entrar al panel Web.';
        } else if (err.status === 401 || err.status === 400) {
          this.errorMsg = 'Usuario o contraseña incorrectos.';
        } else if (err.status === 0) {
          this.errorMsg = 'No se pudo conectar con el servidor.';
        } else {
          this.errorMsg = 'Error al iniciar sesión. Intenta de nuevo.';
        }
      },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────
  isInvalid(campo: string): boolean {
    const ctrl = this.form?.get(campo);
    return !!(this.submitted && ctrl?.invalid);
  }

  togglePass(): void {
    this.mostrarPass = !this.mostrarPass;
  }
}