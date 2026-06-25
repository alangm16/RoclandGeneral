// colaboradores-form.component.ts
// Formulario para Personal de Servicio (Estibadores, Mantenimiento, etc.)
// Conectado a la API real vía AccesoService.registrarColaborador()

import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Subscription, forkJoin } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

import { AccesoService } from '../../../services/acceso.service';
import {
  TipoIdentificacion,
  MotivoVisita,
  PersonaAutocompletado,
  DatosConfirmacion,
  CrearColaboradorRequest,
} from '../../../models/acceso.models';

@Component({
  selector: 'app-colaboradores-form',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './colaboradores-form.component.html',
  styleUrl: './colaboradores-form.component.scss',
})
export class ColaboradoresFormComponent implements OnInit, OnDestroy {

  // ── Inyecciones ───────────────────────────────────────────────────
  private readonly fb         = inject(FormBuilder);
  private readonly router     = inject(Router);
  private readonly service    = inject(AccesoService);
  private readonly platformId = inject(PLATFORM_ID);

  // ── Estado ────────────────────────────────────────────────────────
  form!:      FormGroup;
  submitted   = false;
  loading     = false;
  errorMsg    = '';

  cargandoCatalogos = true;
  errorCatalogos    = false;

  // ── Catálogos ─────────────────────────────────────────────────────
  tiposIdentificacion: TipoIdentificacion[] = [];
  motivos:             MotivoVisita[]        = [];

  // ── Autocompletado ─────────────────────────────────────────────────
  buscando          = false;
  personaRecurrente = false;
  totalVisitas      = 0;
  autofilled: Record<string, boolean> = {};

  private subs = new Subscription();

  // ── Lifecycle ──────────────────────────────────────────────────────
  ngOnInit(): void {
    this.buildForm();
    this.cargarCatalogos();
    if (isPlatformBrowser(this.platformId)) {
      this.setupAutocomplete();
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  // ── Formulario ────────────────────────────────────────────────────
  private buildForm(): void {
    this.form = this.fb.group({
      tipoIdentificacionId  : ['', [Validators.required]],
      numeroIdentificacion  : ['', [Validators.required, Validators.minLength(3), Validators.maxLength(60)]],
      nombre                : ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
      telefono              : ['', [Validators.maxLength(20)]],
      email                 : ['', [Validators.email, Validators.maxLength(100)]],
      empresaContratista    : ['', [Validators.maxLength(150)]],  // ← campo específico
      motivoId              : ['', [Validators.required]],
      unidadPlacas          : ['', [Validators.maxLength(30)]],
      observaciones         : ['', [Validators.maxLength(500)]],
      consentimientoFirmado : [false, [Validators.requiredTrue]],
    });
  }

  // ── Catálogos ─────────────────────────────────────────────────────
  cargarCatalogos(): void {
    this.cargandoCatalogos = true;
    this.errorCatalogos    = false;

    const sub = forkJoin({
      tipos  : this.service.getTiposIdentificacion(),
      motivos: this.service.getMotivos('Colaborador'), // ← filtro específico
    }).subscribe({
      next: ({ tipos, motivos }) => {
        this.tiposIdentificacion = tipos;
        this.motivos             = motivos;
        this.cargandoCatalogos   = false;
      },
      error: () => {
        this.cargandoCatalogos = false;
        this.errorCatalogos    = true;
      },
    });

    this.subs.add(sub);
  }

  // ── Autocompletado ────────────────────────────────────────────────
  private setupAutocomplete(): void {
    const sub = this.form.get('numeroIdentificacion')!.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap((val: string) => {
          this.clearAutofill();
          if (!val || val.trim().length < 3) {
            this.buscando = false;
            return [];
          }
          this.buscando = true;
          return this.service.buscarPersona(val.trim());
        })
      )
      .subscribe({
        next: (persona: PersonaAutocompletado | null) => {
          this.buscando = false;
          if (persona) this.applyPersona(persona);
        },
        error: () => { this.buscando = false; },
      });

    this.subs.add(sub);
  }

  private clearAutofill(): void {
    // Los campos que se pueden autocompletar (mapeo empresa → empresaContratista)
    const campos = ['nombre', 'empresaContratista', 'telefono', 'email'];
    campos.forEach(campo => {
      if (this.autofilled[campo]) {
        this.form.get(campo)?.setValue('', { emitEvent: false });
      }
    });
    this.autofilled        = {};
    this.personaRecurrente = false;
    this.totalVisitas      = 0;
  }

  private applyPersona(persona: PersonaAutocompletado): void {
    // Mapeamos el campo 'empresa' de la persona a 'empresaContratista' del formulario
    const map: Record<string, string> = {
      nombre              : persona.nombre,
      empresaContratista  : persona.empresa ?? '',
      telefono            : persona.telefono ?? '',
      email               : persona.email ?? '',
    };

    Object.entries(map).forEach(([campo, valor]) => {
      if (valor) {
        this.form.get(campo)?.setValue(valor, { emitEvent: false });
        this.autofilled[campo] = true;
      }
    });

    if (persona.totalVisitas > 0) {
      this.personaRecurrente = true;
      this.totalVisitas      = persona.totalVisitas;
    }
  }

  // ── Placas en mayúsculas ──────────────────────────────────────────
  onPlacasInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const upper = input.value.toUpperCase();
    this.form.get('unidadPlacas')?.setValue(upper, { emitEvent: false });
    input.value = upper;
  }

  // ── Submit ────────────────────────────────────────────────────────
  onSubmit(): void {
    this.submitted = true;
    this.errorMsg  = '';

    if (this.form.invalid) {
      setTimeout(() => {
        const firstInvalid = document.querySelector(
          'input.ng-invalid, select.ng-invalid, textarea.ng-invalid'
        ) as HTMLElement | null;
        firstInvalid?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInvalid?.focus();
      }, 0);
      return;
    }

    this.loading = true;

    const sub = this.service.registrarColaborador(this.buildPayload()).subscribe({
      next: (data) => {
        const confirmacion: DatosConfirmacion = {
          nombre: data.nombre,
          tipo:   'Personal de Servicio',
          id:     data.registroId,
          hora:   new Date(data.fechaEntrada).toLocaleTimeString('es-MX', {
            hour: '2-digit', minute: '2-digit',
          }),
        };
        sessionStorage.setItem('rocland_confirm', JSON.stringify(confirmacion));
        this.router.navigate(['/public/acceso-control/confirmacion']);
      },
      error: (err: Error) => {
        this.errorMsg = err.message;
        this.loading  = false;
        setTimeout(() => {
          document.getElementById('alertError')
            ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 0);
      },
    });

    this.subs.add(sub);
  }

  // ── Helpers ───────────────────────────────────────────────────────
  isInvalid(campo: string): boolean {
    const ctrl = this.form.get(campo);
    return !!(this.submitted && ctrl?.invalid);
  }

  private buildPayload(): CrearColaboradorRequest {
    const v = this.form.value;
    return {
      nombre               : (v.nombre as string).trim(),
      tipoIdentificacionId : Number(v.tipoIdentificacionId),
      numeroIdentificacion : (v.numeroIdentificacion as string).trim(),
      telefono             : v.telefono?.trim()      || null,
      email                : v.email?.trim()         || null,
      empresaContratista   : v.empresaContratista?.trim() || null,
      motivoId             : Number(v.motivoId),
      unidadPlacas         : v.unidadPlacas?.trim().toUpperCase() || null,
      consentimientoFirmado: v.consentimientoFirmado as boolean,
      observaciones        : v.observaciones?.trim() || null,
    };
  }
}