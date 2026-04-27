import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { Subject, forkJoin, takeUntil } from 'rxjs';
import { LayoutService } from '../../../../../core/services/layout.service';
import { AdminService } from '../../../services/admin.service';
import { BadgeComponent } from '../../../../../shared/components/badge/badge-component';
import { CatalogoItem, CatalogoCreateDto } from '../../../models/admin.models';

@Component({
  selector: 'app-catalogos',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatMenuModule, BadgeComponent],
  templateUrl: './catalogos.component.html',
  styleUrls: ['./catalogos.component.scss'],
})
export class CatalogosComponent implements OnInit, OnDestroy {
  private readonly layoutSvc = inject(LayoutService);
  private readonly adminSvc = inject(AdminService);
  private readonly destroy$ = new Subject<void>();

  // Datos
  areas   = signal<CatalogoItem[]>([]);
  motivos = signal<CatalogoItem[]>([]);
  tiposId = signal<CatalogoItem[]>([]);

  // Control de formularios inline
  mostrarForm: Record<string, boolean> = { areas: false, motivos: false, tiposid: false };
  nuevoNombre: Record<string, string>  = { areas: '',    motivos: '',    tiposid: '' };
  guardando:   Record<string, boolean> = { areas: false, motivos: false, tiposid: false };

  ngOnInit(): void {
    this.layoutSvc.setSubheader({ title: 'Catálogos', showSearch: false });
    this.cargarCatalogos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.layoutSvc.resetSubheader();
  }

  private cargarCatalogos(): void {
    forkJoin({
      areas:   this.adminSvc.getCatalogo('areas'),
      motivos: this.adminSvc.getCatalogo('motivos'),
      tiposid: this.adminSvc.getCatalogo('tiposid'),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.areas.set(res.areas);
          this.motivos.set(res.motivos);
          this.tiposId.set(res.tiposid);
        },
        error: (err) => console.error('Error al cargar catálogos', err),
      });
  }

  abrirForm(tipo: string): void {
    this.mostrarForm[tipo] = true;
    setTimeout(() => {
      const input = document.getElementById(`input-${tipo}`) as HTMLInputElement;
      input?.focus();
    }, 0);
  }

  cerrarForm(tipo: string): void {
    this.mostrarForm[tipo] = false;
    this.nuevoNombre[tipo] = '';
  }

  crearItem(tipo: string): void {
    const nombre = this.nuevoNombre[tipo]?.trim();
    if (!nombre) return;

    this.guardando[tipo] = true;
    const dto: CatalogoCreateDto = { nombre };

    this.adminSvc.crearCatalogo(tipo as any, dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.guardando[tipo] = false;
          this.cerrarForm(tipo);
          this.cargarCatalogos();
        },
        error: () => {
          alert('Error al guardar. Intenta de nuevo.');
          this.guardando[tipo] = false;
        },
      });
  }

  toggleItem(tipo: string, id: number): void {
    this.adminSvc.toggleCatalogo(tipo as any, id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.cargarCatalogos(),
        error: () => alert('Error al cambiar estado.'),
      });
  }
}