import { Component, Input, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

const BADGE_MAP: Record<string, string> = {
  // Estados
  'Aprobado':   'green',
  'Rechazado':  'red',
  'Pendiente':  'amber',
  'Sin salida': 'amber',
  // Tipos de visita
  'Visitante':  'blue',
};

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="bd" [class]="'badge--' + variant">
      {{ label }}
    </span>
  `,
  styles: [], // Las clases .bd y .badge--* están en styles.scss
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class BadgeComponent {
  @Input({ required: true }) label!: string;

  private _explicitVariant?: string;

  /** Permite fijar explícitamente la variante de color. */
  @Input()
  set variant(value: string | undefined) {
    this._explicitVariant = value ?? undefined;
  }

  /** Devuelve la variante explícita si se pasó, o infiere del label. */
  get variant(): string {
    if (this._explicitVariant) return this._explicitVariant;
    return BADGE_MAP[this.label] ?? 'purple';
  }
}