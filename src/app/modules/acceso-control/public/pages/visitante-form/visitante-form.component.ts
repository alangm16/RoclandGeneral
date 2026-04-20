// visitante-form.component.ts
// Sprint 2 — Conectado a la API real. Reemplaza el archivo del Sprint 1 completo.

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
import { Subject, Subscription, forkJoin } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

import { AccesoService } from '../../../services/acceso.service'
import {
  TipoIdentificacion,
  Area,
  MotivoVisita,
  PersonaAutocompletado,
  DatosConfirmacion,
} from '../../../models/acceso.models';

@Component({
  selector: 'app-visitante-form',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './visitante-form.component.html',
  styleUrl: './visitante-form.component.scss',
})
export class VisitanteFormComponent implements OnInit, OnDestroy {

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

  // Estado de carga de catálogos
  cargandoCatalogos = true;
  errorCatalogos    = false;

  // ── Catálogos ─────────────────────────────────────────────────────
  tiposIdentificacion: TipoIdentificacion[] = [];
  areas:               Area[]               = [];
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

    // El autocompletado solo corre en browser (no en SSR)
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
      empresa               : ['', [Validators.maxLength(150)]],
      areaId                : ['', [Validators.required]],
      motivoId              : ['', [Validators.required]],
      observaciones         : ['', [Validators.maxLength(500)]],
      consentimientoFirmado : [false, [Validators.requiredTrue]],
    });
  }

  // ── Catálogos ─────────────────────────────────────────────────────
  // Carga los 3 catálogos en paralelo con forkJoin para un solo ciclo HTTP
  cargarCatalogos(): void {
    this.cargandoCatalogos = true;
    this.errorCatalogos    = false;

    const sub = forkJoin({
      tipos  : this.service.getTiposIdentificacion(),
      areas  : this.service.getAreas(),
      motivos: this.service.getMotivos(),
    }).subscribe({
      next: ({ tipos, areas, motivos }) => {
        this.tiposIdentificacion = tipos;
        this.areas               = areas;
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
  // Equivalente Angular del autocompletado.js original:
  // - debounceTime(500)        = DEBOUNCE_MS del JS
  // - distinctUntilChanged()   = evita relanzar si el valor no cambió
  // - switchMap()              = cancela la petición anterior automáticamente
  //                              (equivale al AbortController del JS original)
  private setupAutocomplete(): void {
    const sub = this.form.get('numeroIdentificacion')!.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap((val: string) => {
          this.clearAutofill();

          if (!val || val.trim().length < 3) {
            this.buscando = false;
            return [];  // Observable vacío — no hace ninguna petición
          }

          this.buscando = true;
          return this.service.buscarPersona(val.trim());
        })
      )
      .subscribe({
        next: (persona: PersonaAutocompletado | null) => {
          this.buscando = false;
          if (persona) {
            this.applyPersona(persona);
          }
          // Si es null (404 o error) → clearAutofill ya limpió los campos
        },
        error: () => {
          // El servicio ya maneja errores silenciosamente en buscarPersona()
          this.buscando = false;
        },
      });

    this.subs.add(sub);
  }

  private clearAutofill(): void {
    const campos = ['nombre', 'empresa', 'telefono', 'email'];
    campos.forEach(campo => {
      if (this.autofilled[campo]) {
        this.form.get(campo)?.setValue('', { emitEvent: false });
      }
    });
    this.autofilled       = {};
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

    const sub = this.service.registrarVisitante(this.buildPayload()).subscribe({
      next: (data) => {
        const confirmacion: DatosConfirmacion = {
          nombre: data.nombre,
          tipo:   'Visitante',
          id:     data.registroId,
          hora:   new Date(data.fechaEntrada).toLocaleTimeString('es-MX', {
            hour: '2-digit', minute: '2-digit',
          }),
        };
        sessionStorage.setItem('rocland_confirm', JSON.stringify(confirmacion));
        this.router.navigate(['/acceso/confirmacion']);
      },
      error: (err: Error) => {
        this.errorMsg = err.message;
        this.loading  = false;
        // Scroll al alert de error
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
      empresa              : v.empresa?.trim()      || null,
      telefono             : v.telefono?.trim()     || null,
      email                : v.email?.trim()        || null,
      areaId               : Number(v.areaId),
      motivoId             : Number(v.motivoId),
      consentimientoFirmado: v.consentimientoFirmado as boolean,
      observaciones        : v.observaciones?.trim() || null,
    };
  }
}