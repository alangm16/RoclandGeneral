import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html'
  // styleUrl: './app.scss' <-- Si tenías esta línea, déjala; si no, la puedes omitir
})
export class App {  // <--- ¡Aquí está el cambio clave!
  title = 'roclandgeneral';
}