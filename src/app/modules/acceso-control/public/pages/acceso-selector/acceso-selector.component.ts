// acceso-selector.component.ts
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-acceso-selector',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './acceso-selector.component.html',
  styleUrl: './acceso-selector.component.scss',
})
export class AccesoSelectorComponent {}