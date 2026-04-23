// src/app/modules/home/pages/landing/landing.component.ts
// ─────────────────────────────────────────────────────────────────────────────
// Landing general de Rocland. No pertenece a ningún proyecto/módulo.
// Es la puerta de entrada a toda la aplicación.
// Sprint futuro: reemplazar el contenido por el diseño final.
// ─────────────────────────────────────────────────────────────────────────────

import { Component } from '@angular/core';
import { Router }    from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  template: `
    <div class="landing-shell">
      <div class="landing-card">
        <img
          src="assets/images/logo_rocland.png"
          alt="Rocland"
          class="landing-logo"
          onerror="this.style.display='none'"
        />
        <h1 class="landing-title">Rocland</h1>
        <p class="landing-subtitle">Plataforma de gestión empresarial</p>
      </div>
    </div>
  `,
  styles: [`
    .landing-shell {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f5f5f5;
    }
    .landing-card {
      background: white;
      border-radius: 12px;
      padding: 48px 40px;
      text-align: center;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
      max-width: 400px;
      width: 100%;
    }
    .landing-logo {
      height: 64px;
      margin-bottom: 24px;
    }
    .landing-title {
      font-size: 2rem;
      font-weight: 700;
      margin: 0 0 8px;
      color: #1a1a1a;
    }
    .landing-subtitle {
      color: #666;
      margin: 0 0 40px;
      font-size: 1rem;
    }
    .landing-actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .btn-primary {
      background: #1a1a1a;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 14px 24px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    .btn-primary:hover { opacity: 0.85; }
  `],
})
export class LandingComponent {
  constructor(private router: Router) {}

}