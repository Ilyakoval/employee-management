import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../api.service';
import {
  CrossDepartmentRow,
  DepartmentCountRow,
  DepartmentSalaryRow,
  SalaryAboveManagerRow,
  TopEarnerRow
} from '../../models';

const PREVIEW_ROWS = 8;

/** The five SQL tasks from the assignment, rendered live from the API. */
@Component({
  selector: 'app-reports-page',
  imports: [DecimalPipe],
  templateUrl: './reports-page.html',
  styleUrl: './reports-page.scss'
})
export class ReportsPage implements OnInit {
  private readonly api = inject(ApiService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly totals = signal<DepartmentSalaryRow[]>([]);
  readonly topEarners = signal<TopEarnerRow[]>([]);
  readonly largeDepartments = signal<DepartmentCountRow[]>([]);
  readonly aboveManager = signal<SalaryAboveManagerRow[]>([]);
  readonly crossDepartment = signal<CrossDepartmentRow[]>([]);

  readonly showAllAboveManager = signal(false);
  readonly showAllCrossDepartment = signal(false);

  readonly previewRows = PREVIEW_ROWS;

  readonly maxTotal = computed(() =>
    this.totals().reduce((max, row) => Math.max(max, row.totalSalary), 0)
  );

  readonly aboveManagerVisible = computed(() =>
    this.showAllAboveManager() ? this.aboveManager() : this.aboveManager().slice(0, PREVIEW_ROWS)
  );

  readonly crossDepartmentVisible = computed(() =>
    this.showAllCrossDepartment() ? this.crossDepartment() : this.crossDepartment().slice(0, PREVIEW_ROWS)
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      totals: this.api.getDepartmentSalaryTotals(),
      topEarners: this.api.getTopEarners(),
      largeDepartments: this.api.getLargeDepartments(),
      aboveManager: this.api.getSalaryAboveManager(),
      crossDepartment: this.api.getCrossDepartmentManagers()
    }).subscribe({
      next: data => {
        this.totals.set(data.totals);
        this.topEarners.set(data.topEarners);
        this.largeDepartments.set(data.largeDepartments);
        this.aboveManager.set(data.aboveManager);
        this.crossDepartment.set(data.crossDepartment);
        this.loading.set(false);
      },
      error: (error: Error) => {
        this.error.set(error.message);
        this.loading.set(false);
      }
    });
  }

  barWidth(row: DepartmentSalaryRow): number {
    const max = this.maxTotal();
    return max === 0 ? 0 : Math.round((row.totalSalary / max) * 100);
  }
}
