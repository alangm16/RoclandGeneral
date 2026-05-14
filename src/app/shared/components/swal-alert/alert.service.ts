import { Injectable } from '@angular/core';
import Swal, { SweetAlertResult } from 'sweetalert2';

@Injectable({ providedIn: 'root' })
export class AlertService {

  private readonly base = Swal.mixin({
    customClass: {
      popup:         'rl-swal-popup',
      title:         'rl-swal-title',
      htmlContainer: 'rl-swal-html',
      confirmButton: 'rl-swal-btn rl-swal-btn--confirm',
      cancelButton:  'rl-swal-btn rl-swal-btn--cancel',
      denyButton:    'rl-swal-btn rl-swal-btn--deny',
      icon:          'rl-swal-icon',
    },
    buttonsStyling:    false,
    reverseButtons:    true,
    focusConfirm:      false,
    showDenyButton:    false,
    allowOutsideClick: true,
    willClose: () => {
      // Limpia cualquier backdrop huérfano que Swal deje en el DOM
      document.querySelectorAll('.swal2-container').forEach(el => el.remove());
      document.body.classList.remove('swal2-shown', 'swal2-height-auto');
    },
  });

  // ── CONFIRMACIONES ──────────────────────────────────────────────────

  async confirmar(opts: {
    titulo?: string;
    texto?: string;
    labelConfirmar?: string;
    labelCancelar?: string;
  } = {}): Promise<boolean> {
    const result = await this.base.fire({
      icon:              'question',
      title:             opts.titulo ?? '¿Estás seguro?',
      text:              opts.texto  ?? 'Esta acción requiere tu confirmación.',
      showCancelButton:  true,
      showDenyButton:    false,
      confirmButtonText: opts.labelConfirmar ?? 'Sí, confirmar',
      cancelButtonText:  opts.labelCancelar  ?? 'Cancelar',
    });
    return result.isConfirmed;
  }

  async confirmarAgregar(entidad = 'el registro'): Promise<boolean> {
    const result = await this.base.fire({
      icon:              'question',
      title:             '¿Agregar registro?',
      html:              `Se creará <strong>${entidad}</strong>.<br>¿Deseas continuar?`,
      showCancelButton:  true,
      showDenyButton:    false,
      confirmButtonText: '<i class="bi bi-plus-circle me-1"></i> Agregar',
      cancelButtonText:  'Cancelar',
      customClass: {
        popup:         'rl-swal-popup',
        title:         'rl-swal-title',
        htmlContainer: 'rl-swal-html',
        confirmButton: 'rl-swal-btn rl-swal-btn--confirm rl-swal-btn--green',
        cancelButton:  'rl-swal-btn rl-swal-btn--cancel',
        icon:          'rl-swal-icon',
      },
    });
    return result.isConfirmed;
  }

  async confirmarEditar(entidad = 'el registro'): Promise<boolean> {
    const result = await this.base.fire({
      icon:              'question',
      title:             '¿Guardar cambios?',
      html:              `Se actualizará <strong>${entidad}</strong>.<br>¿Deseas continuar?`,
      showCancelButton:  true,
      showDenyButton:    false,
      confirmButtonText: '<i class="bi bi-pencil-square me-1"></i> Guardar cambios',
      cancelButtonText:  'Cancelar',
      customClass: {
        popup:         'rl-swal-popup',
        title:         'rl-swal-title',
        htmlContainer: 'rl-swal-html',
        confirmButton: 'rl-swal-btn rl-swal-btn--confirm rl-swal-btn--green',
        cancelButton:  'rl-swal-btn rl-swal-btn--cancel',
        icon:          'rl-swal-icon',
      },
    });
    return result.isConfirmed;
  }

  async confirmarEliminar(entidad = 'el registro'): Promise<boolean> {
    const result = await this.base.fire({
      icon:              'warning',
      title:             '¿Eliminar registro?',
      html:              `Se eliminará <strong>${entidad}</strong> de forma permanente.<br>Esta acción <u>no se puede deshacer</u>.`,
      showCancelButton:  true,
      showDenyButton:    false,
      confirmButtonText: '<i class="bi bi-trash3 me-1"></i> Sí, eliminar',
      cancelButtonText:  'Cancelar',
      customClass: {
        popup:         'rl-swal-popup',
        title:         'rl-swal-title',
        htmlContainer: 'rl-swal-html',
        confirmButton: 'rl-swal-btn rl-swal-btn--confirm rl-swal-btn--red',
        cancelButton:  'rl-swal-btn rl-swal-btn--cancel',
        icon:          'rl-swal-icon rl-swal-icon--warning',
      },
    });
    return result.isConfirmed;
  }

  // ── FEEDBACK ────────────────────────────────────────────────────────

  exito(mensaje: string, titulo = '¡Listo!'): Promise<SweetAlertResult> {
    return this.base.fire({
      icon:              'success',
      title:             titulo,
      text:              mensaje,
      timer:             3000,
      timerProgressBar:  true,
      showConfirmButton: false,
      allowOutsideClick: true,
    });
  }

  error(mensaje: string, titulo = 'Ocurrió un error'): Promise<SweetAlertResult> {
    return this.base.fire({
      icon:              'error',
      title:             titulo,
      text:              mensaje,
      showDenyButton:    false,
      confirmButtonText: 'Entendido',
      allowOutsideClick: true,
    });
  }

  advertencia(mensaje: string, titulo = 'Atención'): Promise<SweetAlertResult> {
    return this.base.fire({
      icon:              'warning',
      title:             titulo,
      text:              mensaje,
      timer:             4000,
      timerProgressBar:  true,
      showConfirmButton: false,
      allowOutsideClick: true,
    });
  }

  info(mensaje: string, titulo = 'Información'): Promise<SweetAlertResult> {
    return this.base.fire({
      icon:              'info',
      title:             titulo,
      text:              mensaje,
      timer:             3000,
      timerProgressBar:  true,
      showConfirmButton: false,
      allowOutsideClick: true,
    });
  }

  // ── FLUJOS CRUD ─────────────────────────────────────────────────────

  async flujoAgregar(entidad: string, accion: () => Promise<void>): Promise<void> {
    const ok = await this.confirmarAgregar(entidad);
    if (!ok) return;
    try {
      await accion();
      await this.exito(`${entidad} fue agregado correctamente.`);
    } catch {
      await this.error(`No se pudo agregar ${entidad}. Intenta de nuevo.`);
    }
  }

  async flujoEditar(entidad: string, accion: () => Promise<void>): Promise<void> {
    const ok = await this.confirmarEditar(entidad);
    if (!ok) return;
    try {
      await accion();
      await this.exito(`${entidad} fue actualizado correctamente.`);
    } catch {
      await this.error(`No se pudo actualizar ${entidad}. Intenta de nuevo.`);
    }
  }

  async flujoEliminar(entidad: string, accion: () => Promise<void>): Promise<void> {
    const ok = await this.confirmarEliminar(entidad);
    if (!ok) return;
    try {
      await accion();
      await this.exito(`${entidad} fue eliminado correctamente.`);
    } catch {
      await this.error(`No se pudo eliminar ${entidad}. Intenta de nuevo.`);
    }
  }
}