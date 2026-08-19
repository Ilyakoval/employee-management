import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DeleteDialog } from './delete-dialog';
import { Employee } from '../models';

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

const MANAGER = employee({ id: 1, firstName: 'Alice', lastName: 'Boss' });
const TEAM = [
  MANAGER,
  employee({ id: 2, firstName: 'Bob', lastName: 'Worker', managerId: 1 }),
  employee({ id: 3, firstName: 'Carol', lastName: 'Third', managerId: 1 })
];

describe('DeleteDialog', () => {
  let fixture: ComponentFixture<DeleteDialog>;
  let emitted: (number | 'none' | null)[];

  function create(target: Employee, all: Employee[]): void {
    fixture = TestBed.createComponent(DeleteDialog);
    fixture.componentRef.setInput('employee', target);
    fixture.componentRef.setInput('allEmployees', all);
    emitted = [];
    fixture.componentInstance.confirmed.subscribe(v => emitted.push(v));
    fixture.detectChanges();
  }

  const clickDanger = () =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.btn-danger')!.click();

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DeleteDialog] }).compileComponents();
  });

  it('deletes a non-manager with a single confirmation', () => {
    create(employee({ id: 5, firstName: 'Solo', lastName: 'Nobody' }), TEAM);

    clickDanger();

    expect(emitted).toEqual([null]);
  });

  it('requires a second confirmation step for a manager', () => {
    create(MANAGER, TEAM);

    clickDanger(); // "Continue" — goes to the summary step
    fixture.detectChanges();

    expect(emitted).toEqual([]);
    const text = (fixture.nativeElement as HTMLElement).textContent!;
    expect(text).toContain('You are about to delete manager Alice Boss');
    expect(text).toContain('without a manager');

    clickDanger(); // "Yes, delete manager"
    expect(emitted).toEqual(['none']);
  });

  it('summarizes the chosen manager and emits his id', () => {
    create(MANAGER, TEAM);
    fixture.componentInstance.reassignTo.set(2);
    fixture.detectChanges();

    clickDanger();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent!;
    expect(text).toContain('reassign his 2 employees');
    expect(text).toContain('Bob Worker');

    clickDanger();
    expect(emitted).toEqual([2]);
  });

  it('the Back button returns to the manager choice without emitting', () => {
    create(MANAGER, TEAM);

    clickDanger();
    fixture.detectChanges();
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.btn-ghost')!
      .click(); // Back
    fixture.detectChanges();

    expect(emitted).toEqual([]);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Choose a new manager');
  });
});
