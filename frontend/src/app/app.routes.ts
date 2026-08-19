import { Routes } from '@angular/router';
import { EmployeesPage } from './pages/employees/employees-page';
import { ReportsPage } from './pages/reports/reports-page';
import { OrgPage } from './pages/org/org-page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'employees' },
  { path: 'employees', component: EmployeesPage, title: 'Employees — Employee Management' },
  { path: 'reports', component: ReportsPage, title: 'Reports — Employee Management' },
  { path: 'org', component: OrgPage, title: 'Org chart — Employee Management' },
  { path: '**', redirectTo: 'employees' }
];
