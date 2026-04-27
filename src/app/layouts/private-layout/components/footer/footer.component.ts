import { Component } from '@angular/core';
import { environment } from '../../../../../environments/Environment'

@Component({
  selector: 'app-footer',
  standalone: true,
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent {
  currentYear = new Date().getFullYear();
  version = environment.version || '1.0.0';
}