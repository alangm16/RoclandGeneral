// dashboard.component.ts
// Placeholder — Sprint 5 construirá el dashboard real con KPIs, gráficas y tabla.

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="placeholder-page">
      <div class="placeholder-icon">
        <i class="bi bi-speedometer2"></i>
      </div>
      <h2>Dashboard</h2>
      <p>En construcción — Sprint 5</p>
    </div>
  `,
  styles: [`
    .placeholder-page {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 60vh;
      gap: 0.75rem;
      color: #6B7280;
      font-family: 'IBM Plex Sans', sans-serif;
    }
    .placeholder-icon {
      font-size: 3rem;
      color: #D1D5DB;
    }
    h2 {
      font-size: 1.25rem;
      font-weight: 700;
      color: #374151;
      margin: 0;
    }
    p { font-size: 0.88rem; margin: 0; }
  `],
})
export class DashboardComponent {}