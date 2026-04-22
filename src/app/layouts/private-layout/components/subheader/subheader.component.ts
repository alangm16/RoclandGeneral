import { Component, inject, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, startWith } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NgClass } from '@angular/common';
import { LayoutService } from '../../../../core/services/layout.service';

@Component({
  selector: 'app-subheader',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, NgClass],
  templateUrl: './subheader.component.html',
  styleUrls: ['./subheader.component.scss']
})
export class SubheaderComponent implements OnInit {
  // layoutService ahora debe ser publico para acceder a searchValue desde el html
  public readonly layoutService = inject(LayoutService);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  
  ngOnInit(): void {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      startWith(null),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      let route = this.activatedRoute;
      while (route.firstChild) route = route.firstChild;
      
      const data = route.snapshot.data;
      
      this.layoutService.resetSubheader(); 

      if (data['subheader']) {
        this.layoutService.setSubheader(data['subheader']);
      }
    });
  }
  
  get config() {
    return this.layoutService.subheaderConfig();
  }

  // --- NUEVOS MÉTODOS PARA LA BARRA DE BÚSQUEDA ---
  onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    // Actualizamos la señal del servicio, lo cual notificará a PersonasComponent
    this.layoutService.searchValue.set(target.value); 
  }

  clearSearch(): void {
    this.layoutService.searchValue.set('');
  }
}