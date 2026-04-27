import { Component, inject, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, startWith } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { LayoutService } from '../../../../core/services/layout.service';

@Component({
  selector: 'app-subheader',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatMenuModule],
  templateUrl: './subheader.component.html',
  styleUrls: ['./subheader.component.scss'],
})
export class SubheaderComponent implements OnInit {
  public readonly layoutService = inject(LayoutService);
  private readonly router        = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly destroyRef    = inject(DestroyRef);

  ngOnInit(): void {
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      startWith(null),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => {
      // Recorre hasta la ruta hija más profunda activa
      let route = this.activatedRoute;
      while (route.firstChild) route = route.firstChild;

      const data = route.snapshot.data;

      // Siempre reseteamos antes de aplicar la nueva config de ruta.
      // Los componentes que necesiten handlers (exportar, agregar) los
      // registrarán ellos mismos llamando a layoutService.setSubheader()
      // dentro de su ngOnInit, DESPUÉS de esta navegación.
      this.layoutService.resetSubheader();

      if (data['subheader']) {
        this.layoutService.setSubheader(data['subheader']);
      }
    });
  }

  get config() {
    return this.layoutService.subheaderConfig();
  }

  // ── Búsqueda ──────────────────────────────────────────────────────────────
  onSearchChange(event: Event): void {
    this.layoutService.searchValue.set((event.target as HTMLInputElement).value);
  }

  clearSearch(): void {
    this.layoutService.searchValue.set('');
  }

  // ── Filtros dinámicos ─────────────────────────────────────────────────────
  onFilterChange(key: string, event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.layoutService.filterValues.update(f => ({ ...f, [key]: val }));
  }

  onFilterDateChange(key: string, event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.layoutService.filterValues.update(f => ({ ...f, [key]: val }));
  }

  onFilterTextChange(key: string, event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.layoutService.filterValues.update(f => ({ ...f, [key]: val }));
  }
}