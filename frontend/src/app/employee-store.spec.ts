import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../environments/environment';
import { EmployeeStore } from './employee-store';
import { Employee } from './models';

const API = environment.apiBaseUrl;

const employee = (overrides: Partial<Employee>): Employee => ({
  id: 0,
  firstName: 'First',
  lastName: 'Last',
  departmentId: 1,
  departmentName: 'Finance',
  managerId: null,
  managerName: null,
  salary: 1000,
  ...overrides
});

describe('EmployeeStore', () => {
  let store: EmployeeStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    store = TestBed.inject(EmployeeStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function seed(employees: Employee[]): void {
    store.loadAll();
    http.expectOne(`${API}/departments`).flush([]);
    http.expectOne(`${API}/employees`).flush(employees);
  }

  it('loadAll populates state and clears the loading flag', () => {
    seed([employee({ id: 1 })]);

    expect(store.employees().length).toBe(1);
    expect(store.loading()).toBe(false);
    expect(store.loadError()).toBeNull();
  });

  it('loadAll surfaces server errors', () => {
    store.loadAll();
    http.expectOne(`${API}/departments`).flush([]);
    http.expectOne(`${API}/employees`).flush(
      { title: 'Database is down.' },
      { status: 500, statusText: 'Server Error' }
    );

    expect(store.loadError()).toBe('Database is down.');
    expect(store.loading()).toBe(false);
  });

  it('create appends the saved employee', () => {
    seed([]);

    store.create({ firstName: 'A', lastName: 'B', departmentId: 1, managerId: null, salary: 1 }).subscribe();
    http.expectOne(`${API}/employees`).flush(employee({ id: 10, firstName: 'A', lastName: 'B' }));

    expect(store.employees().map(e => e.id)).toEqual([10]);
  });

  it('update replaces the employee and propagates the new name to subordinates', () => {
    seed([
      employee({ id: 1, firstName: 'Alice', lastName: 'Boss' }),
      employee({ id: 2, firstName: 'Bob', lastName: 'Worker', managerId: 1, managerName: 'Alice Boss' })
    ]);

    store.update(1, { firstName: 'Alicia', lastName: 'Boss', departmentId: 1, managerId: null, salary: 1 }).subscribe();
    http.expectOne(`${API}/employees/1`).flush(employee({ id: 1, firstName: 'Alicia', lastName: 'Boss' }));

    expect(store.employees().find(e => e.id === 1)?.firstName).toBe('Alicia');
    expect(store.employees().find(e => e.id === 2)?.managerName).toBe('Alicia Boss');
  });

  it('delete removes the employee from state', () => {
    seed([employee({ id: 1 }), employee({ id: 2 })]);

    store.delete(1).subscribe();
    http.expectOne(`${API}/employees/1`).flush(null);

    expect(store.employees().map(e => e.id)).toEqual([2]);
  });

  it('delete keeps state intact when the server refuses', () => {
    seed([employee({ id: 1 })]);

    let message = '';
    store.delete(1).subscribe({ error: (e: Error) => (message = e.message) });
    http.expectOne(`${API}/employees/1`).flush(
      { title: 'This employee is a manager of other employees and cannot be deleted.' },
      { status: 409, statusText: 'Conflict' }
    );

    expect(message).toContain('cannot be deleted');
    expect(store.employees().length).toBe(1);
  });

  it('managers lists only employees that actually manage someone', () => {
    seed([
      employee({ id: 1, firstName: 'Alice', lastName: 'Boss' }),
      employee({ id: 2, firstName: 'Bob', lastName: 'Worker', managerId: 1 })
    ]);

    expect(store.managers()).toEqual([{ id: 1, fullName: 'Alice Boss' }]);
  });
});
