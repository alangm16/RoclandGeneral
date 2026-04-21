// proveedor-form.component.ts
// Sprint 3 — Formulario de Proveedor / Cliente conectado a la API.
// Estructura idéntica al visitante pero con las diferencias del dominio:
//   - campo `empresa` es REQUERIDO aquí (opcional en visitante)
//   - campos extras: `unidadPlacas` (uppercase automático) y `facturaRemision`
//   - NO tiene `areaId`
//   - POST va a /api/proveedores → ProveedorResponse

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
} from '../../../models/acceso.models';

@Component({
  selector: 'app-proveedor-form',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './proveedor-form.component.html',
  styleUrl: './proveedor-form.component.scss',
})
export class ProveedorFormComponent implements OnInit, OnDestroy {

  // ── Inyecciones ───────────────────────────────────────────────────
  private readonly fb         = inject(FormBuilder);
  private readonly router     = inject(Router);
  private readonly service    = inject(AccesoService);
  private readonly platformId = inject(PLATFORM_ID);

  // ── Estado ────────────────────────────────────────────────────────
  form!:    FormGroup;
  submitted = false;
  loading   = false;
  errorMsg  = '';

  cargandoCatalogos = true;
  errorCatalogos    = false;

  // ── Catálogos ─────────────────────────────────────────────────────
  // Proveedor no usa `areas` — solo tipos de ID y motivos
  tiposIdentificacion: TipoIdentificacion[] = [];
  motivos:             MotivoVisita[]        = [];

  // ── Autocompletado ────────────────────────────────────────────────
  buscando           = false;
  personaRecurrente  = false;
  totalVisitas       = 0;
  autofilled: Record<string, boolean> = {};

  private subs = new Subscription();

  // ── Lifecycle ─────────────────────────────────────────────────────
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
      // empresa es REQUERIDA en proveedor (a diferencia de visitante)
      empresa               : ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
      telefono              : ['', [Validators.maxLength(20)]],
      email                 : ['', [Validators.email, Validators.maxLength(100)]],
      motivoId              : ['', [Validators.required]],
      // Campos exclusivos de proveedor
      unidadPlacas          : ['', [Validators.maxLength(30)]],
      facturaRemision       : ['', [Validators.maxLength(100)]],
      observaciones         : ['', [Validators.maxLength(500)]],
      consentimientoFirmado : [false, [Validators.requiredTrue]],
    });
  }

  // ── Catálogos ─────────────────────────────────────────────────────
  // Proveedor solo necesita tipos de ID y motivos (sin áreas)
  cargarCatalogos(): void {
    this.cargandoCatalogos = true;
    this.errorCatalogos    = false;

    const sub = forkJoin({
      tipos  : this.service.getTiposIdentificacion(),
      motivos: this.service.getMotivos(),
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
    // Proveedor tiene empresa como campo autofillable también
    const campos = ['nombre', 'empresa', 'telefono', 'email'];
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
    const map: Record<string, string> = {
      nombre  : persona.nombre,
      empresa : persona.empresa  ?? '',
      telefono: persona.telefono ?? '',
      email   : persona.email    ?? '',
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

  // ── Placas en mayúsculas (equivale al style="text-transform:uppercase" del original
  //    + la conversión .toUpperCase() en buildPayload del proveedor-form.js)
  onPlacasInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const upper = input.value.toUpperCase();
    this.form.get('unidadPlacas')?.setValue(upper, { emitEvent: false });
    input.value = upper; // actualiza el DOM directamente para el cursor
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

    const sub = this.service.registrarProveedor(this.buildPayload()).subscribe({
      next: (data) => {
        const confirmacion: DatosConfirmacion = {
          nombre: data.nombre,
          tipo:   'Proveedor / Cliente',
          id:     data.registroId,
          hora:   new Date(data.fechaEntrada).toLocaleTimeString('es-MX', {
            hour: '2-digit', minute: '2-digit',
          }),
        };
        sessionStorage.setItem('rocland_confirm', JSON.stringify(confirmacion));
        this.router.navigate(['/public/acceso-control-web/confirmacion']);
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

  private buildPayload() {
    const v = this.form.value;
    return {
      nombre               : (v.nombre as string).trim(),
      tipoIdentificacionId : Number(v.tipoIdentificacionId),
      numeroIdentificacion : (v.numeroIdentificacion as string).trim(),
      empresa              : (v.empresa as string).trim(),
      telefono             : v.telefono?.trim()        || null,
      email                : v.email?.trim()           || null,
      motivoId             : Number(v.motivoId),
      unidadPlacas         : v.unidadPlacas?.trim().toUpperCase() || null,
      facturaRemision      : v.facturaRemision?.trim() || null,
      consentimientoFirmado: v.consentimientoFirmado as boolean,
      observaciones        : v.observaciones?.trim()   || null,
    };
  }
}