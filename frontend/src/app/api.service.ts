import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../environments/environment';
import {
  CrossDepartmentRow,
  Department,
  DepartmentCountRow,
  DepartmentSalaryRow,
  Employee,
  EmployeeUpsert,
  SalaryAboveManagerRow,
  TopEarnerRow
} from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  getEmployees(): Observable<Employee[]> {
    return this.http.get<Employee[]>(`${this.baseUrl}/employees`).pipe(this.handleError());
  }

  createEmployee(dto: EmployeeUpsert): Observable<Employee> {
    return this.http.post<Employee>(`${this.baseUrl}/employees`, dto).pipe(this.handleError());
  }

  updateEmployee(id: number, dto: EmployeeUpsert): Observable<Employee> {
    return this.http.put<Employee>(`${this.baseUrl}/employees/${id}`, dto).pipe(this.handleError());
  }

  /**
   * Deletes an employee. When he manages others, pass `reassignTo`
   * (an employee id or 'none') to move his subordinates atomically.
   */
  deleteEmployee(id: number, reassignTo?: number | 'none'): Observable<void> {
    const options = reassignTo === undefined ? {} : { params: { reassignTo: String(reassignTo) } };
    return this.http.delete<void>(`${this.baseUrl}/employees/${id}`, options).pipe(this.handleError());
  }

  getDepartments(): Observable<Department[]> {
    return this.http.get<Department[]>(`${this.baseUrl}/departments`).pipe(this.handleError());
  }

  // ---- Reports ----

  getSalaryAboveManager(): Observable<SalaryAboveManagerRow[]> {
    return this.http.get<SalaryAboveManagerRow[]>(`${this.baseUrl}/reports/salary-above-manager`).pipe(this.handleError());
  }

  getTopEarners(): Observable<TopEarnerRow[]> {
    return this.http.get<TopEarnerRow[]>(`${this.baseUrl}/reports/top-earners`).pipe(this.handleError());
  }

  getLargeDepartments(): Observable<DepartmentCountRow[]> {
    return this.http.get<DepartmentCountRow[]>(`${this.baseUrl}/reports/large-departments`).pipe(this.handleError());
  }

  getCrossDepartmentManagers(): Observable<CrossDepartmentRow[]> {
    return this.http.get<CrossDepartmentRow[]>(`${this.baseUrl}/reports/cross-department-managers`).pipe(this.handleError());
  }

  getDepartmentSalaryTotals(): Observable<DepartmentSalaryRow[]> {
    return this.http.get<DepartmentSalaryRow[]>(`${this.baseUrl}/reports/department-salary-totals`).pipe(this.handleError());
  }

  /** Extracts a human-readable message from ASP.NET Core ProblemDetails. */
  private handleError<T>() {
    return catchError<T, Observable<T>>((error: HttpErrorResponse) => {
      const message =
        error.error?.title ??
        (error.status === 0
          ? 'Cannot reach the server. Make sure the API is running.'
          : `Unexpected error (HTTP ${error.status}).`);
      return throwError(() => new Error(message));
    });
  }
}
