import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { Department, Employee, EmployeeUpsert } from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:5080/api';

  getEmployees(): Observable<Employee[]> {
    return this.http.get<Employee[]>(`${this.baseUrl}/employees`).pipe(this.handleError());
  }

  createEmployee(dto: EmployeeUpsert): Observable<Employee> {
    return this.http.post<Employee>(`${this.baseUrl}/employees`, dto).pipe(this.handleError());
  }

  updateEmployee(id: number, dto: EmployeeUpsert): Observable<Employee> {
    return this.http.put<Employee>(`${this.baseUrl}/employees/${id}`, dto).pipe(this.handleError());
  }

  deleteEmployee(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/employees/${id}`).pipe(this.handleError());
  }

  getDepartments(): Observable<Department[]> {
    return this.http.get<Department[]>(`${this.baseUrl}/departments`).pipe(this.handleError());
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
