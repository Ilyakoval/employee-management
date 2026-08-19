import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { Department, Employee, EmployeeUpsert } from './models';

/** Holds the employee/department data and keeps it consistent across CRUD calls. */
@Injectable({ providedIn: 'root' })
export class EmployeeStore {
  private readonly api = inject(ApiService);

  readonly employees = signal<Employee[]>([]);
  readonly departments = signal<Department[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

  /** Employees that manage at least one other person. */
  readonly managers = computed(() => {
    const managerIds = new Set(
      this.employees().map(e => e.managerId).filter((id): id is number => id !== null)
    );
    return this.employees()
      .filter(e => managerIds.has(e.id))
      .map(e => ({ id: e.id, fullName: `${e.firstName} ${e.lastName}`.trim() }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  });

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

  create(dto: EmployeeUpsert): Observable<Employee> {
    return this.api.createEmployee(dto).pipe(
      tap(saved => this.employees.update(list => [...list, saved]))
    );
  }

  update(id: number, dto: EmployeeUpsert): Observable<Employee> {
    return this.api.updateEmployee(id, dto).pipe(
      tap(saved =>
        this.employees.update(list => {
          // A rename must also be reflected in rows where this employee is the manager.
          const managerName = `${saved.firstName} ${saved.lastName}`.trim();
          return list.map(e => {
            if (e.id === saved.id) return saved;
            return e.managerId === saved.id ? { ...e, managerName } : e;
          });
        })
      )
    );
  }

  delete(id: number): Observable<void> {
    return this.api.deleteEmployee(id).pipe(
      tap(() => this.employees.update(list => list.filter(e => e.id !== id)))
    );
  }
}
