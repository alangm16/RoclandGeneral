import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { debounceTime, distinctUntilChanged, filter, switchMap, catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { AccesoService } from '../../../services/acceso.service';

@Component({
  selector: 'app-visitante-form',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: 'visitante-form.component.html',
  styleUrls: ['visitante-form.component.scss'] // O .css si no usas scss
})
export class VisitanteFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private accesoService = inject(AccesoService);

  visitanteForm!: FormGroup;
  
  isSubmitting = false;
  buscandoPersona = false;
  personaEncontrada = false;
  submitError: string | null = null;
  submitSuccess = false;

  // Catálogos mockeados (luego puedes consumirlos de tu AdminService)
  tiposIdentificacion = [
    { id: 1, nombre: 'INE' },
    { id: 2, nombre: 'Pasaporte' },
    { id: 3, nombre: 'Licencia' }
  ];
  areas = [
    { id: 1, nombre: 'Recursos Humanos' },
    { id: 2, nombre: 'Sistemas' },
    { id: 3, nombre: 'Producción' }
  ];
  motivos = [
    { id: 1, nombre: 'Entrevista' },
    { id: 2, nombre: 'Reunión de trabajo' },
    { id: 3, nombre: 'Mantenimiento' }
  ];

  ngOnInit(): void {
    this.iniciarFormulario();
    this.configurarAutocompletado();
  }

  private iniciarFormulario(): void {
    this.visitanteForm = this.fb.group({
      numeroIdentificacion: ['', [Validators.required, Validators.minLength(3)]],
      tipoIdentificacionId: ['', Validators.required],
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      telefono: [''],
      email: ['', Validators.email],
      areaId: ['', Validators.required],
      motivoId: ['', Validators.required],
      observaciones: [''],
      consentimientoFirmado: [false, Validators.requiredTrue]
    });
  }

  // ── ESTA ES LA MAGIA QUE REEMPLAZA A autocompletado.js ──
  private configurarAutocompletado(): void {
    this.visitanteForm.get('numeroIdentificacion')?.valueChanges
      .pipe(
        // Espera 500ms después de que el usuario deja de escribir
        debounceTime(500),
        // Solo dispara si el valor realmente cambió
        distinctUntilChanged(),
        // Solo busca si tiene 3 caracteres o más
        filter(val => val && val.length >= 3),
        // Cancela peticiones anteriores si el usuario sigue escribiendo
        switchMap(val => {
          this.buscandoPersona = true;
          this.submitError = null;
          return this.accesoService.buscarPersona(val).pipe(
            catchError(err => {
              // Si da 404 (No existe), atrapamos el error para no romper el flujo
              return of(null);
            }),
            finalize(() => this.buscandoPersona = false)
          );
        })
      )
      .subscribe((persona: any) => {
        if (persona) {
          this.personaEncontrada = true;
          // Autocompletamos los campos
          this.visitanteForm.patchValue({
            nombre: persona.nombre,
            tipoIdentificacionId: persona.tipoIdentificacionId,
            telefono: persona.telefono,
            email: persona.email
          });
          // Si quieres que no modifique su nombre una vez registrado:
          // this.visitanteForm.get('nombre')?.disable(); 
        } else {
          this.personaEncontrada = false;
          // Limpiamos los campos para que registre uno nuevo
          const numIdActual = this.visitanteForm.get('numeroIdentificacion')?.value;
          this.visitanteForm.reset({
            numeroIdentificacion: numIdActual, // Mantenemos lo que escribió
            tipoIdentificacionId: '',
            nombre: '',
            telefono: '',
            email: '',
            areaId: this.visitanteForm.get('areaId')?.value,
            motivoId: this.visitanteForm.get('motivoId')?.value,
          });
          this.visitanteForm.get('nombre')?.enable();
        }
      });
  }

  onSubmit(): void {
    if (this.visitanteForm.invalid) {
      this.visitanteForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.submitError = null;

    // getRawValue incluye campos deshabilitados si llegaras a usar .disable()
    const payload = this.visitanteForm.getRawValue(); 

    this.accesoService.registrarVisitante(payload).subscribe({
      next: (res) => {
        this.submitSuccess = true;
        this.isSubmitting = false;
        // Opcional: Redirigir a una ruta de "Confirmación" 
        // this.router.navigate(['/acceso/confirmacion', res.registroId]);
      },
      error: (err) => {
        console.error('Error al registrar', err);
        this.submitError = err.error?.message || 'Ocurrió un error al procesar tu solicitud.';
        this.isSubmitting = false;
      }
    });
  }
}