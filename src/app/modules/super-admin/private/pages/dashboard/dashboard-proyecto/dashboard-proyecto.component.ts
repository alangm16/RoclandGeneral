// dashboard-proyecto.component.ts
import {
  Component, OnInit, OnDestroy, inject, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { LayoutService } from '../../../../../../core/services/layout.service';
import { SuperadminService } from '../../../../services/super-admin.service';
import { BadgeComponent } from '../../../../../../shared/components/badge/badge-component';
import { DataTableComponent, DataTableColumn } from '../../../../../../shared/components/data-table/data-table.component';
import {
  DashboardProyectoDto,
  UltimoAccesoDto
} from '../../../../models/superadmin.models';

@Component({
  selector: 'app-dashboard-proyecto',
  standalone: true,
  imports: [CommonModule, RouterModule, BadgeComponent, DataTableComponent],
  templateUrl: './dashboard-proyecto.component.html',
  styleUrls: ['./dashboard-proyecto.component.scss'],
})
export class DashboardProyectoComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly layoutSvc = inject(LayoutService);
  private readonly superadminSvc = inject(SuperadminService);

  cargando = signal(true);
  datos = signal<DashboardProyectoDto | null>(null);
  proyectoId = signal<number>(0);

  readonly columnasUltimosAccesos: DataTableColumn[] = [
    { key: 'username', label: 'Usuario' },
    { key: 'fecha',    label: 'Fecha' },
  ];

  ngOnInit(): void {
    this.layoutSvc.setSubheader({ title: 'Dashboard del Proyecto', showSearch: false });
    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));
      if (id) {
        this.proyectoId.set(id);
        this.cargarDashboard(id);
      }
    });
  }

  ngOnDestroy(): void {
    this.layoutSvc.resetSubheader();
  }

  private cargarDashboard(id: number): void {
    this.superadminSvc.getDashboardProyecto(id).subscribe({
      next: (dto) => {
        this.datos.set(dto);
        this.cargando.set(false);
        this.layoutSvc.setSubheader({
          title: dto.nombre,
          subtitle: dto.codigo,
          showSearch: false
        });
      },
      error: (err) => {
        console.error('Error al cargar dashboard del proyecto', err);
        this.cargando.set(false);
      }
    });
  }

  getEstadoClass(estado: string): string {
    const map: Record<string, string> = {
      'Produccion': 'bg-success',
      'Mantenimiento': 'bg-warning',
      'Desarrollo': 'bg-info',
    };
    return map[estado] || 'bg-secondary';
  }
}