import { filterEmployees, sortEmployees } from './employee-filters';
import { Employee } from './models';

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

const LIST: Employee[] = [
  employee({ id: 1, firstName: 'Alice', lastName: 'Boss', departmentId: 1, departmentName: 'Finance', salary: 5000 }),
  employee({ id: 2, firstName: 'Bob', lastName: 'Worker', departmentId: 1, departmentName: 'Finance', managerId: 1, managerName: 'Alice Boss', salary: 3000 }),
  employee({ id: 3, firstName: 'Carol', lastName: 'Álvarez', departmentId: 2, departmentName: 'HR', managerId: 1, managerName: 'Alice Boss', salary: null })
];

describe('filterEmployees', () => {
  it('returns everything when no filters are active', () => {
    expect(filterEmployees(LIST, { query: '', departmentId: null, managerId: null })).toEqual(LIST);
  });

  it('matches the query against name, surname, department and manager', () => {
    const byManager = filterEmployees(LIST, { query: 'alice boss', departmentId: null, managerId: null });
    expect(byManager.map(e => e.id)).toEqual([1, 2, 3]); // Alice herself + her two reports

    const bySurname = filterEmployees(LIST, { query: 'worker', departmentId: null, managerId: null });
    expect(bySurname.map(e => e.id)).toEqual([2]);
  });

  it('is case-insensitive and trims the query', () => {
    expect(filterEmployees(LIST, { query: '  CAROL ', departmentId: null, managerId: null }).map(e => e.id)).toEqual([3]);
  });

  it('combines department and manager filters with the query', () => {
    const result = filterEmployees(LIST, { query: 'alice', departmentId: 1, managerId: 1 });
    expect(result.map(e => e.id)).toEqual([2]);
  });
});

describe('sortEmployees', () => {
  it('returns the original order when no column is selected', () => {
    expect(sortEmployees(LIST, null, 'asc')).toEqual(LIST);
  });

  it('sorts numbers numerically and keeps nulls last', () => {
    const asc = sortEmployees(LIST, 'salary', 'asc').map(e => e.id);
    expect(asc).toEqual([2, 1, 3]); // 3000, 5000, null

    const desc = sortEmployees(LIST, 'salary', 'desc').map(e => e.id);
    expect(desc).toEqual([1, 2, 3]);
  });

  it('sorts strings with locale awareness', () => {
    const sorted = sortEmployees(LIST, 'lastName', 'asc').map(e => e.lastName);
    expect(sorted).toEqual(['Álvarez', 'Boss', 'Worker']);
  });

  it('does not mutate the input array', () => {
    const copy = [...LIST];
    sortEmployees(LIST, 'salary', 'desc');
    expect(LIST).toEqual(copy);
  });
});
