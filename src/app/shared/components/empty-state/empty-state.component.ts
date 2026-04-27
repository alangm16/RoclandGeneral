import {
  Component,
  Input,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * app-empty-state — Estado vacío reutilizable del sistema Rocland.
 *
 * Usos principales:
 * ──────────────────────────────────────────────────────────────
 * 1. Dentro de una tabla (sin datos):
 *    <app-empty-state
 *      icon="bi-inbox"
 *      message="No se encontraron personas."
 *      hint="Intenta ajustar los filtros de búsqueda." />
 *
 * 2. En una cuadrícula de cards (inline):
 *    <app-empty-state
 *      layout="inline"
 *      icon="bi-people"
 *      message="Sin visitantes dentro actualmente." />
 *
 * 3. Página completa (error 404, módulo vacío):
 *    <app-empty-state
 *      layout="page"
 *      icon="bi-folder2-open"
 *      message="No tienes registros aún."
 *      hint="Comienza creando tu primer elemento."
 *      actionLabel="Crear registro"
 *      (action)="onCrear()" />
 * ──────────────────────────────────────────────────────────────
 */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './empty-state.component.html',
  styleUrls: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  /**
   * Disposición del componente.
   * - `table`  → centrado dentro de una fila `<td>`, padding generoso (default)
   * - `inline` → compacto, horizontal, para grids de cards
   * - `page`   → centrado verticalmente en el área de contenido, icono grande
   */
  @Input() layout: 'table' | 'inline' | 'page' = 'table';

  /**
   * Clase Bootstrap Icons (ej. `'bi-inbox'`, `'bi-people'`).
   * El icono se escala según el layout.
   */
  @Input() icon = 'bi-inbox';

  /** Mensaje principal (obligatorio). */
  @Input({ required: true }) message = '';

  /**
   * Texto de ayuda secundario.
   * Ej. "Intenta ajustar los filtros o crea un nuevo registro."
   */
  @Input() hint?: string;

  /**
   * Etiqueta del botón de acción principal (opcional).
   * Si no se proporciona, no se renderiza el botón.
   */
  @Input() actionLabel?: string;

  /**
   * Icono Bootstrap Icons del botón de acción (ej. `'bi-plus-lg'`).
   */
  @Input() actionIcon?: string;

  /**
   * Handler del botón de acción.
   * Se puede usar `(click)` directamente en el botón proyectado,
   * o pasar una función al `@Input` para casos simples.
   */
  @Input() action?: () => void;

  onActionClick(): void {
    this.action?.();
  }

  get hostClasses(): Record<string, boolean> {
    return {
      [`layout-${this.layout}`]: true,
    };
  }
}