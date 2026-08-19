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
