import { Component, inject, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, startWith } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LayoutService } from '../../../../core/services/layout.service';

@Component({
  selector: 'app-subheader',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, NgClass, FormsModule],
  templateUrl: './subheader.component.html',
  styleUrls: ['./subheader.component.scss']
})
export class SubheaderComponent implements OnInit {
  readonly layoutService = inject(LayoutService);
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

  get searchValue() {
    return this.layoutService.searchValue();
  }

  onSearchInput(value: string) {
    this.layoutService.onSearchInput(value);
  }

  /** Dispara el handler de la acción correspondiente */
  runAction(action: { handler: () => void }) {
    action.handler();
  }
}