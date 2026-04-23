// login.component.ts
// Rocland — Página de Login Universal
// Sprint 4

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';

import { AuthService } from '../../../core/auth/auth.service';
import { ProyectoDisponible } from '../../../core/auth/auth.models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl:    './login.component.scss',
})
export class LoginComponent implements OnInit {

  private readonly fb      = inject(FormBuilder);
  private readonly auth    = inject(AuthService);
  private readonly router  = inject(Router);
  private readonly route   = inject(ActivatedRoute);

  // ── Estado ────────────────────────────────────────────────────
  form!:      FormGroup;
  submitted   = false;
  loading     = false;
  errorMsg    = '';
  mostrarPass = false;

  // ── Proyectos ─────────────────────────────────────────────────
  proyectos: ProyectoDisponible[] = [];
  proyectoSeleccionado: ProyectoDisponible | null = null;

  // ── Lifecycle ─────────────────────────────────────────────────
  ngOnInit(): void {
    // 1. SIEMPRE inicializar el formulario primero
    this.buildForm();

    // 2. Si ya hay sesión activa (browser hidratado con localStorage),
    //    navegar de inmediato sin mostrar el formulario.
    //    Respeta el returnUrl para volver exactamente a donde estaba el usuario.
    if (this.auth.estaLogueado()) {
      this.navegarPostLogin();
      return;
    }

    this.proyectos = this.auth.getProyectosActivos();

    if (this.proyectos.length === 1) {
      this.seleccionarProyecto(this.proyectos[0].id);
    }
  }

  // ── Formulario ────────────────────────────────────────────────
  private buildForm(): void {
    this.form = this.fb.group({
      usuario:    ['', [Validators.required, Validators.minLength(3)]],
      password:   ['', [Validators.required, Validators.minLength(4)]],
      proyectoId: ['', [Validators.required]],
    });
  }

  // ── Navegación post-login ─────────────────────────────────────
  // Centraliza la lógica de a dónde ir después de autenticarse.
  // Prioridad: returnUrl (ruta donde estaba el usuario) → dashboard del proyecto.
  // Protección contra open redirect: solo se aceptan rutas internas (inician con /).
  private navegarPostLogin(): void {
    const returnUrl = this.route.snapshot.queryParams['returnUrl'];
    const esRutaInterna = typeof returnUrl === 'string' && returnUrl.startsWith('/');
    const destino = esRutaInterna
      ? returnUrl
      : `/private/${this.auth.proyectoActual()}/dashboard`;

    this.router.navigateByUrl(destino);
  }

  // ── Selección de proyecto ─────────────────────────────────────
  seleccionarProyecto(id: string): void {
    this.proyectoSeleccionado = this.auth.getProyecto(id) ?? null;
    this.form.get('proyectoId')?.setValue(id);
    this.errorMsg = '';
  }

  getProyecto(id: string): ProyectoDisponible | undefined {
    return this.proyectos.find(p => p.id === id);
  }

  // ── Submit ────────────────────────────────────────────────────
  onSubmit(): void {
    this.submitted = true;
    this.errorMsg  = '';

    if (this.form.invalid || !this.proyectoSeleccionado) return;

    this.loading = true;

    const { usuario, password } = this.form.value;

    this.auth.login(
      { usuario, password },
      this.proyectoSeleccionado
    ).subscribe({
      next: (response) => {
        const rolesPermitidos = this.proyectoSeleccionado!.rolesPermitidos;
        if (!rolesPermitidos.includes(response.rol)) {
          this.loading  = false;
          this.errorMsg = 'No tienes permisos para acceder a este módulo.';
          this.auth.logout();
          return;
        }

        // Navegar respetando el returnUrl si existe, o al dashboard del proyecto
        this.navegarPostLogin();
      },
      error: (err) => {
        this.loading = false;
        if (err.status === 401) {
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

  readonly year = new Date().getFullYear();
}