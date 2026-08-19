import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmployeeStore } from '../../employee-store';
import { Employee, EmployeeUpsert } from '../../models';
import { SortColumn, SortDirection, filterEmployees, sortEmployees } from '../../employee-filters';
import { EmployeeForm } from '../../employee-form/employee-form';
import { DeleteDialog } from '../../delete-dialog/delete-dialog';
import { HighlightPipe } from '../../shared/highlight.pipe';
import { Select, SelectOption } from '../../shared/select';

interface Toast {
  type: 'success' | 'error';
  text: string;
}

interface Column {
  key: SortColumn;
  label: string;
  numeric: boolean;
}

@Component({
  selector: 'app-employees-page',
  imports: [DecimalPipe, FormsModule, EmployeeForm, DeleteDialog, HighlightPipe, Select],
  templateUrl: './employees-page.html',
  styleUrl: './employees-page.scss'
})
export class EmployeesPage {
  readonly store = inject(EmployeeStore);

  readonly columns: Column[] = [
    { key: 'firstName', label: 'Name', numeric: false },
    { key: 'lastName', label: 'Surname', numeric: false },
    { key: 'departmentName', label: 'Department', numeric: false },
    { key: 'managerName', label: 'Manager', numeric: false },
    { key: 'salary', label: 'Salary', numeric: true }
  ];

  // Filters and sorting (view state)
  readonly search = signal('');
  readonly departmentFilter = signal<number | null>(null);
  readonly managerFilter = signal<number | null>(null);
  readonly sortColumn = signal<SortColumn | null>(null);
  readonly sortDirection = signal<SortDirection>('asc');

  readonly departmentOptions = computed<SelectOption[]>(() => [
    { value: null, label: 'All departments' },
    ...this.store.departments().map(d => ({ value: d.id, label: d.name }))
  ]);

  readonly managerOptions = computed<SelectOption[]>(() => [
    { value: null, label: 'All managers' },
    ...this.store.managers().map(m => ({ value: m.id, label: m.fullName }))
  ]);

  readonly hasActiveFilters = computed(
    () => this.search().trim() !== '' || this.departmentFilter() !== null || this.managerFilter() !== null
  );

  readonly filtered = computed(() => {
    const visible = filterEmployees(this.store.employees(), {
      query: this.search(),
      departmentId: this.departmentFilter(),
      managerId: this.managerFilter()
    });
    return sortEmployees(visible, this.sortColumn(), this.sortDirection());
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

  sortState(column: SortColumn): SortDirection | null {
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
    const request = current ? this.store.update(current.id, dto) : this.store.create(dto);

    request.subscribe({
      next: () => {
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

  closeDelete(): void {
    if (!this.deleteBusy()) {
      this.deleting.set(null);
    }
  }

  confirmDelete(reassignTo: number | 'none' | null): void {
    const employee = this.deleting();
    if (!employee) {
      return;
    }
    this.deleteBusy.set(true);
    this.deleteError.set(null);
    this.store.delete(employee.id, reassignTo ?? undefined).subscribe({
      next: () => {
        this.deleteBusy.set(false);
        this.deleting.set(null);
        this.showToast(
          'success',
          reassignTo === null ? 'Employee deleted' : 'Team reassigned, employee deleted'
        );
      },
      error: (error: Error) => {
        this.deleteBusy.set(false);
        this.deleteError.set(error.message);
      }
    });
  }

  dismissToast(): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    this.toast.set(null);
  }

  private showToast(type: Toast['type'], text: string): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    this.toast.set({ type, text });
    this.toastTimer = setTimeout(() => this.toast.set(null), 3200);
  }
}
