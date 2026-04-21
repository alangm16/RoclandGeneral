import { Component } from '@angular/core';
@Component({
  selector: 'app-personas', standalone: true,
  template: `<div class="ph"><div class="ph-icon"><i class="bi bi-shield-fill"></i></div><h2>Guardias</h2><p>En construcción — Sprint 5</p></div>`,
  styles: [`.ph{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;gap:.75rem;color:#6B7280;font-family:'IBM Plex Sans',sans-serif}.ph-icon{font-size:3rem;color:#D1D5DB}h2{font-size:1.25rem;font-weight:700;color:#374151;margin:0}p{font-size:.88rem;margin:0}`]
})
export class PersonasComponent {}