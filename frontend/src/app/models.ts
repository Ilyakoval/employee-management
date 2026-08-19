export interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  departmentId: number | null;
  departmentName: string | null;
  managerId: number | null;
  managerName: string | null;
  salary: number | null;
}

export interface EmployeeUpsert {
  firstName: string;
  lastName: string;
  departmentId: number;
  managerId: number | null;
  salary: number;
}

export interface Department {
  id: number;
  name: string;
}

export interface EmployeeLookup {
  id: number;
  fullName: string;
}

// ---- Reports (the 5 SQL tasks as API responses) ----

export interface SalaryAboveManagerRow {
  id: number;
  employee: string;
  salary: number;
  manager: string;
  managerSalary: number;
}

export interface TopEarnerRow {
  department: string;
  employee: string;
  salary: number;
}

export interface DepartmentCountRow {
  department: string;
  employeeCount: number;
}

export interface CrossDepartmentRow {
  id: number;
  employee: string;
  employeeDepartment: string;
  manager: string;
  managerDepartment: string;
}

export interface DepartmentSalaryRow {
  department: string;
  totalSalary: number;
}
