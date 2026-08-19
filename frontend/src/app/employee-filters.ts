import { Employee } from './models';

export type SortColumn = 'firstName' | 'lastName' | 'departmentName' | 'managerName' | 'salary';
export type SortDirection = 'asc' | 'desc';

export interface EmployeeFilters {
  query: string;
  departmentId: number | null;
  managerId: number | null;
}

export function filterEmployees(employees: Employee[], filters: EmployeeFilters): Employee[] {
  const query = filters.query.trim().toLowerCase();

  return employees.filter(e => {
    if (filters.departmentId !== null && e.departmentId !== filters.departmentId) {
      return false;
    }
    if (filters.managerId !== null && e.managerId !== filters.managerId) {
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
}

export function sortEmployees(
  employees: Employee[],
  column: SortColumn | null,
  direction: SortDirection
): Employee[] {
  if (!column) {
    return employees;
  }

  const sign = direction === 'asc' ? 1 : -1;
  return [...employees].sort((a, b) => {
    const left = a[column];
    const right = b[column];
    if (left === null || left === undefined) return 1;
    if (right === null || right === undefined) return -1;
    const cmp =
      typeof left === 'number' && typeof right === 'number'
        ? left - right
        : String(left).localeCompare(String(right));
    return cmp * sign;
  });
}
