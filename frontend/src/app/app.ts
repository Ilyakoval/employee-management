import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from './api.service';
import { ThemeService } from './theme.service';
import { Department, Employee, EmployeeUpsert } from './models';
import { EmployeeForm } from './employee-form/employee-form';
import { ConfirmDialog } from './confirm-dialog/confirm-dialog';

interface Toast {
  type: 'success' | 'error';
  text: string;
}

type SortColumn = 'firstName' | 'lastName' | 'departmentName' | 'managerName' | 'salary';

@Component({
  selector: 'app-root',
  imports: [DecimalPipe, FormsModule, EmployeeForm, ConfirmDialog],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  private readonly api = inject(ApiService);
  readonly theme = inject(ThemeService);

  readonly employees = signal<Employee[]>([]);
  readonly departments = signal<Department[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

  // Filters
  readonly search = signal('');
  readonly departmentFilter = signal<number | null>(null);
  readonly managerFilter = signal<number | null>(null);

  // Sorting
  readonly sortColumn = signal<SortColumn | null>(null);
  readonly sortDirection = signal<'asc' | 'desc'>('asc');

  /** Employees that manage at least one other person — options for the manager filter. */
  readonly managers = computed(() => {
    const managerIds = new Set(
      this.employees().map(e => e.managerId).filter((id): id is number => id !== null)
    );
    return this.employees()
      .filter(e => managerIds.has(e.id))
      .map(e => ({ id: e.id, fullName: `${e.firstName} ${e.lastName}`.trim() }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  });

  readonly hasActiveFilters = computed(
    () => this.search().trim() !== '' || this.departmentFilter() !== null || this.managerFilter() !== null
  );

  readonly filtered = computed(() => {
    const query = this.search().trim().toLowerCase();
    const departmentId = this.departmentFilter();
    const managerId = this.managerFilter();

    let result = this.employees().filter(e => {
      if (departmentId !== null && e.departmentId !== departmentId) {
        return false;
      }
      if (managerId !== null && e.managerId !== managerId) {
        return false;
      }
      if (!query) {
        return true;
      }
      return [e.firstName, e.lastName, e.departmentName ?? '', e.managerName ?? '']
        .join(' ')
        .toLowerCase()
        .includes(query);
    });

    const column = this.sortColumn();
    if (column) {
      const direction = this.sortDirection() === 'asc' ? 1 : -1;
      result = [...result].sort((a, b) => {
        const left = a[column];
        const right = b[column];
        if (left === null || left === undefined) return 1;
        if (right === null || right === undefined) return -1;
        const cmp =
          typeof left === 'number' && typeof right === 'number'
            ? left - right
            : String(left).localeCompare(String(right));
        return cmp * direction;
      });
    }

    return result;
  });

  // Create/edit dialog state
  readonly formOpen = signal(false);
  readonly editing = signal<Employee | null>(null);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);

  // Delete dialog state
  readonly deleting = signal<Employee | null>(null);
  readonly deleteBusy = signal(false);
  readonly deleteError = signal<string | null>(null);

  readonly toast = signal<Toast | null>(null);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.api.getDepartments().subscribe({
      next: departments => this.departments.set(departments),
      error: (error: Error) => this.loadError.set(error.message)
    });
    this.api.getEmployees().subscribe({
      next: employees => {
        this.employees.set(employees);
        this.loading.set(false);
      },
      error: (error: Error) => {
        this.loadError.set(error.message);
        this.loading.set(false);
      }
    });
  }

  sortBy(column: SortColumn): void {
    if (this.sortColumn() === column) {
      if (this.sortDirection() === 'asc') {
        this.sortDirection.set('desc');
      } else {
        // Third click resets sorting back to the natural order.
        this.sortColumn.set(null);
        this.sortDirection.set('asc');
      }
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
  }

  sortState(column: SortColumn): 'asc' | 'desc' | null {
    return this.sortColumn() === column ? this.sortDirection() : null;
  }

  clearFilters(): void {
    this.search.set('');
    this.departmentFilter.set(null);
    this.managerFilter.set(null);
  }

  openCreate(): void {
    this.editing.set(null);
    this.formError.set(null);
    this.formOpen.set(true);
  }

  openEdit(employee: Employee): void {
    this.editing.set(employee);
    this.formError.set(null);
    this.formOpen.set(true);
  }

  closeForm(): void {
    if (!this.saving()) {
      this.formOpen.set(false);
    }
  }

  saveEmployee(dto: EmployeeUpsert): void {
    this.saving.set(true);
    this.formError.set(null);
    const current = this.editing();
    const request = current
      ? this.api.updateEmployee(current.id, dto)
      : this.api.createEmployee(dto);

    request.subscribe({
      next: saved => {
        this.employees.update(list =>
          current
            ? list.map(e => (e.id === saved.id ? saved : e))
            : [...list, saved]
        );
        // A rename or a department change may affect rows where this employee is the manager.
        if (current) {
          this.refreshSilently();
        }
        this.saving.set(false);
        this.formOpen.set(false);
        this.showToast('success', current ? 'Employee updated' : 'Employee created');
      },
      error: (error: Error) => {
        this.saving.set(false);
        this.formError.set(error.message);
      }
    });
  }

  askDelete(employee: Employee): void {
    this.deleteError.set(null);
    this.deleting.set(employee);
  }

  confirmDelete(): void {
    const employee = this.deleting();
    if (!employee) {
      return;
    }
    this.deleteBusy.set(true);
    this.deleteError.set(null);
    this.api.deleteEmployee(employee.id).subscribe({
      next: () => {
        this.employees.update(list => list.filter(e => e.id !== employee.id));
        this.deleteBusy.set(false);
        this.deleting.set(null);
        this.showToast('success', 'Employee deleted');
      },
      error: (error: Error) => {
        this.deleteBusy.set(false);
        this.deleteError.set(error.message);
      }
    });
  }

  private refreshSilently(): void {
    this.api.getEmployees().subscribe({
      next: employees => this.employees.set(employees)
    });
  }

  private showToast(type: Toast['type'], text: string): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    this.toast.set({ type, text });
    this.toastTimer = setTimeout(() => this.toast.set(null), 3200);
  }
}
