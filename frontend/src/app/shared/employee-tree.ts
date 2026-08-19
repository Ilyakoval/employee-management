import { Employee } from '../models';

export interface EmployeeNode {
  employee: Employee;
  children: EmployeeNode[];
  /** Direct + indirect subordinates. */
  totalReports: number;
  /** Placed as a root although he has a manager — his chain forms a cycle. */
  cycleBroken: boolean;
}

/**
 * Builds a forest from the manager references. TestDB has no FK constraints
 * and contains management cycles (e.g. 1 → 7 → 10 → 1), so the builder
 * breaks each cycle at its "biggest" member and marks that node.
 * Every employee appears exactly once.
 */
export function buildEmployeeForest(employees: Employee[]): EmployeeNode[] {
  const byId = new Map(employees.map(e => [e.id, e]));
  const childIds = new Map<number, number[]>();
  for (const e of employees) {
    if (e.managerId !== null && e.managerId !== e.id && byId.has(e.managerId)) {
      const siblings = childIds.get(e.managerId) ?? [];
      siblings.push(e.id);
      childIds.set(e.managerId, siblings);
    }
  }

  const visited = new Set<number>();

  const build = (employee: Employee, cycleBroken: boolean): EmployeeNode => {
    visited.add(employee.id);
    const children = (childIds.get(employee.id) ?? [])
      .filter(id => !visited.has(id))
      .map(id => build(byId.get(id)!, false))
      .sort((a, b) => fullName(a).localeCompare(fullName(b)));
    return {
      employee,
      children,
      cycleBroken,
      totalReports: children.reduce((sum, child) => sum + child.totalReports + 1, 0)
    };
  };

  const roots: EmployeeNode[] = [];

  // Natural roots: no manager, or a manager that does not exist.
  for (const e of employees) {
    if (!visited.has(e.id) && (e.managerId === null || !byId.has(e.managerId))) {
      roots.push(build(e, false));
    }
  }

  // Whatever remains is unreachable from any root — management cycles.
  // Break each one at the member with the most unvisited direct reports.
  while (visited.size < byId.size) {
    const entryPoint = employees
      .filter(e => !visited.has(e.id))
      .sort((a, b) => {
        const aReports = (childIds.get(a.id) ?? []).filter(id => !visited.has(id)).length;
        const bReports = (childIds.get(b.id) ?? []).filter(id => !visited.has(id)).length;
        return bReports - aReports || a.id - b.id;
      })[0];
    roots.push(build(entryPoint, true));
  }

  return roots.sort((a, b) => b.totalReports - a.totalReports);
}

const fullName = (node: EmployeeNode): string =>
  `${node.employee.firstName} ${node.employee.lastName}`;
