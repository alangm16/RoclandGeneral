// confirmacion.component.ts
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

interface DatosConfirmacion {
  nombre: string;
  tipo:   string;
  id:     number;
  hora:   string;
}

@Component({
  selector: 'app-confirmacion',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './confirmacion.component.html',
  styleUrl: './confirmacion.component.scss',
})
export class ConfirmacionComponent implements OnInit {
  datos: DatosConfirmacion | null = null;

  ngOnInit(): void {
    // Mismo contrato que el JS original: lee de sessionStorage y limpia
    const raw = sessionStorage.getItem('rocland_confirm');
    if (raw) {
      try {
        this.datos = JSON.parse(raw);
      } catch {
        // Si no hay datos (acceso directo a la URL), datos queda null
      } finally {
        sessionStorage.removeItem('rocland_confirm');
      }
    }
  }
}