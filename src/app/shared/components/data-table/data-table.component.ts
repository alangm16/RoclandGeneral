import {
  Component,
  Input,
  Output,
  EventEmitter,
  ContentChild,
  TemplateRef,
  ChangeDetectionStrategy,
  ViewEncapsulation
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DataTableColumn {
  key: string;          // identifica la columna (para la celda)
  label: string;        // título visible
  headerClass?: string; // clase CSS opcional para el <th>
  cellClass?: string;   // clase CSS opcional para el <td>
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './data-table.component.html',
  styleUrls: [],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataTableComponent<T = any> {
  // ── Datos y estado ──
  @Input() columns: DataTableColumn[] = [];
  @Input() data: T[] = [];
  @Input() loading = false;
  @Input() emptyMessage = 'No se encontraron resultados.';

  // ── Paginación ──
  @Input() currentPage = 1;
  @Input() totalPages = 1;
  @Output() pageChange = new EventEmitter<number>(); // delta (+1 | -1)

  // ── Templates dinámicos ──
  /**
   * Template para personalizar una celda según su columna.
   * El contexto expone: $implicit, item, column, index
   */
  @ContentChild('cellTemplate', { static: false }) cellTemplate?: TemplateRef<any>;

  /** Template opcional para la fila de carga */
  @ContentChild('loadingTemplate', { static: false }) loadingTemplate?: TemplateRef<any>;

  /** Template opcional para la fila de vacío */
  @ContentChild('emptyTemplate', { static: false }) emptyTemplate?: TemplateRef<any>;

  // ── Método paginación ──
  changePage(delta: number): void {
    this.pageChange.emit(delta);
  }
}