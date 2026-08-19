import { buildEmployeeForest } from './employee-tree';
import { Employee } from '../models';

const employee = (id: number, managerId: number | null, name = `Emp ${id}`): Employee => ({
  id,
  firstName: name,
  lastName: '',
  departmentId: 1,
  departmentName: 'Finance',
  managerId,
  managerName: null,
  salary: 100
});

describe('buildEmployeeForest', () => {
  it('builds a simple tree from manager references', () => {
    const forest = buildEmployeeForest([
      employee(1, null),
      employee(2, 1),
      employee(3, 1),
      employee(4, 2)
    ]);

    expect(forest.length).toBe(1);
    expect(forest[0].employee.id).toBe(1);
    expect(forest[0].totalReports).toBe(3);
    expect(forest[0].children.map(c => c.employee.id).sort()).toEqual([2, 3]);
  });

  it('includes every employee exactly once even with cycles', () => {
    // 1 → 2 → 3 → 1 is a management cycle (like 1 → 7 → 10 → 1 in TestDB).
    const list = [
      employee(1, 3),
      employee(2, 1),
      employee(3, 2),
      employee(4, 1) // regular subordinate hanging off the cycle
    ];

    const forest = buildEmployeeForest(list);

    const ids: number[] = [];
    const walk = (n: { employee: Employee; children: any[] }) => {
      ids.push(n.employee.id);
      n.children.forEach(walk);
    };
    forest.forEach(walk);

    expect(ids.sort()).toEqual([1, 2, 3, 4]);
  });

  it('marks the node where a cycle was broken', () => {
    const forest = buildEmployeeForest([employee(1, 2), employee(2, 1)]);

    expect(forest.length).toBe(1);
    expect(forest[0].cycleBroken).toBe(true);
    expect(forest[0].children.length).toBe(1);
    expect(forest[0].children[0].cycleBroken).toBe(false);
  });

  it('treats a missing manager as a root', () => {
    const forest = buildEmployeeForest([employee(1, 99), employee(2, 1)]);

    expect(forest[0].employee.id).toBe(1);
    expect(forest[0].cycleBroken).toBe(false);
  });

  it('sorts roots by team size, largest first', () => {
    const forest = buildEmployeeForest([
      employee(1, null),
      employee(2, null),
      employee(3, 2),
      employee(4, 2)
    ]);

    expect(forest.map(r => r.employee.id)).toEqual([2, 1]);
  });
});
