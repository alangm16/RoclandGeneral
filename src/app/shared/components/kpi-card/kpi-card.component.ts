import {
  Component,
  Input,
  ChangeDetectionStrategy,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * app-kpi-card — Tarjeta de métrica reutilizable del sistema Rocland.
 *
 * ── Modos ──────────────────────────────────────────────────────
 *
 * 1. DASHBOARD — con icono, valor grande y barra de acento inferior
 *    <app-kpi-card
 *      variant="dashboard"
 *      color="green"
 *      icon="bi-people-fill"
 *      label="Dentro ahora"
 *      [value]="kpis?.dentroAhora"
 *      sub="personas en instalaciones" />
 *
 * 2. COMPACTO — sin icono, estilo inline para modales/paneles
 *    <app-kpi-card
 *      variant="compact"
 *      color="accent"
 *      icon="bi-bar-chart-fill"
 *      label="Visitas Totales"
 *      [value]="perfil.totalVisitas" />
 *
 * 3. STAT — fila horizontal con icono pequeño, para sidebars o listas
 *    <app-kpi-card
 *      variant="stat"
 *      color="blue"
 *      icon="bi-graph-up"
 *      label="Solicitudes"
 *      [value]="42" />
 * ──────────────────────────────────────────────────────────────
 */
@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kpi-card.component.html',
  styleUrls: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class KpiCardComponent {
  /**
   * Modo visual de la tarjeta.
   * - `dashboard` → icono grande + valor XL + barra inferior de acento (dashboard principal)
   * - `compact`   → sin icono visible, valor mediano, ideal para paneles/modales
   * - `stat`      → fila horizontal compacta, icono pequeño a la izquierda
   */
  @Input() variant: 'dashboard' | 'compact' | 'stat' = 'dashboard';

  /**
   * Color del acento (barra inferior en dashboard, borde/fondo en compact).
   * - `green`  → verde Rocland (#4A9C1F)
   * - `accent` → degradado verde suave (usado en modales)
   * - `blue`   → azul (#2563EB)
   * - `purple` → morado (#7C3AED)
   * - `amber`  → ámbar (#D97706)
   * - `red`    → rojo (#DC2626)
   * - `gray`   → neutral, sin acento de color
   */
  @Input() color: 'green' | 'accent' | 'blue' | 'purple' | 'amber' | 'red' | 'gray' = 'gray';

  /**
   * Clase de Bootstrap Icons para el icono (ej. `'bi-people-fill'`).
   * En variant `compact` el icono aparece en el label, no como elemento aparte.
   * Si se omite, no se renderiza ningún icono.
   */
  @Input() icon?: string;

  /** Texto de la etiqueta descriptiva (ej. `'Dentro ahora'`). */
  @Input({ required: true }) label = '';

  /**
   * Valor principal a mostrar.
   * Acepta number, string, null o undefined.
   * Si es null/undefined muestra `'—'`.
   */
  @Input() value: number | string | null | undefined = undefined;

  /**
   * Texto secundario debajo del valor (solo visible en variant `dashboard`).
   * Ej. `'personas en instalaciones'`.
   */
  @Input() sub?: string;

  /**
   * Tamaño del valor.
   * - `xl`  → 2.2rem (default en dashboard)
   * - `md`  → 1.5rem (default en compact)
   * - `sm`  → 1rem   (default en stat, o para valores de texto largos)
   */
  @Input() valueSize: 'xl' | 'md' | 'sm' = 'xl';

  /** Si es true, aplica font-family monospace al valor (útil para números de teléfono, IDs). */
  @Input() mono = false;

  /** Expone el display del valor con fallback. */
  get displayValue(): string {
    if (this.value === null || this.value === undefined || this.value === '') {
      return '—';
    }
    return String(this.value);
  }

  /** Clases CSS calculadas para el host. */
  get hostClasses(): Record<string, boolean> {
    return {
      [`variant-${this.variant}`]: true,
      [`color-${this.color}`]: true,
    };
  }
}