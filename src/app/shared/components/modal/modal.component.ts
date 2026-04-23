import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * app-modal — Modal general reutilizable del sistema Rocland.
 *
 * Uso básico:
 * ──────────────────────────────────────────────────────
 * <app-modal
 *   [isOpen]="mostrarModal()"
 *   [maxWidth]="'860px'"
 *   (closed)="cerrarModal()">
 *
 *   <!-- Proyección del header -->
 *   <ng-container header>
 *     <div class="modal-header-info">
 *       <div class="modal-avatar"><i class="bi bi-person-fill"></i></div>
 *       <div>
 *         <h2 class="modal-title">{{ perfil.nombre }}</h2>
 *         <p class="modal-subtitle">{{ perfil.tipoID }}</p>
 *       </div>
 *     </div>
 *   </ng-container>
 *
 *   <!-- Proyección del body -->
 *   <ng-container body>
 *     <p>Contenido del modal...</p>
 *   </ng-container>
 *
 * </app-modal>
 * ──────────────────────────────────────────────────────
 */
@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalComponent {
  /** Controla la visibilidad del modal. */
  @Input() isOpen = false;

  /** Ancho máximo del panel. Por defecto 860px (igual al diseño de personas). */
  @Input() maxWidth = '860px';

  /**
   * Tamaño del modal. Determina el max-height y algunos paddings.
   * - 'sm'  → 480px  (confirmaciones, alertas)
   * - 'md'  → 640px  (formularios medianos)
   * - 'lg'  → 860px  (detalle, tablas internas)  ← default
   * - 'xl'  → 1100px (workflows complejos)
   */
  @Input() size: 'sm' | 'md' | 'lg' | 'xl' = 'lg';

  /**
   * Si es true el modal NO se cierra al hacer clic en el overlay.
   * Útil para formularios con cambios sin guardar.
   */
  @Input() persistent = false;

  /** Emite cuando el usuario cierra el modal (botón X o clic en overlay). */
  @Output() closed = new EventEmitter<void>();

  /** Cierra con la tecla Escape (a menos que sea persistent). */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen && !this.persistent) {
      this.close();
    }
  }

  onOverlayClick(): void {
    if (!this.persistent) {
      this.close();
    }
  }

  close(): void {
    this.closed.emit();
  }

  /** Expuesto para el template — evita propagación del clic interior. */
  stopPropagation(event: MouseEvent): void {
    event.stopPropagation();
  }
}