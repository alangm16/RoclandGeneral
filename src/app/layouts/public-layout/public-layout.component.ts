import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <header class="bg-slate-900 text-white p-4 shadow-md flex justify-center">
      <img src="assets/images/logo_rocland.png" alt="Rocland Logo" class="h-10">
    </header>

    <main class="min-h-screen bg-slate-50 p-4 md:p-8">
      <router-outlet></router-outlet>
    </main>
  `
})
export class PublicLayoutComponent {}