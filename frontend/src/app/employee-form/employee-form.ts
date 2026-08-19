import { Component, HostListener, OnInit, computed, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Department, Employee, EmployeeUpsert } from '../models';
import { FocusTrap } from '../shared/focus-trap';
import { Select, SelectOption } from '../shared/select';

@Component({
  selector: 'app-employee-form',
  imports: [ReactiveFormsModule, FocusTrap, Select],
  templateUrl: './employee-form.html',
  styleUrl: './employee-form.scss'
})
export class EmployeeForm implements OnInit {
  /** Employee being edited, or null when creating a new one. */
  readonly employee = input<Employee | null>(null);
  readonly departments = input.required<Department[]>();
  readonly allEmployees = input.required<Employee[]>();
  readonly saving = input(false);
  readonly serverError = input<string | null>(null);

  readonly save = output<EmployeeUpsert>();
  readonly closed = output<void>();

  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(49)]],
    lastName: ['', [Validators.required, Validators.maxLength(50)]],
    departmentId: [null as number | null, Validators.required],
    managerId: [null as number | null],
    salary: [null as number | null, [Validators.required, Validators.min(0)]]
  });

  readonly departmentOptions = computed<SelectOption[]>(() =>
    this.departments().map(d => ({ value: d.id, label: d.name }))
  );

  /** An employee cannot be a manager of himself, so exclude him from the options. */
  readonly managerOptions = computed<SelectOption[]>(() => {
    const currentId = this.employee()?.id;
    const employees = this.allEmployees()
      .filter(e => e.id !== currentId)
      .map(e => ({ value: e.id, label: `${e.firstName} ${e.lastName}`.trim() }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return [{ value: null, label: '— No manager —' }, ...employees];
  });

  readonly isEdit = computed(() => this.employee() !== null);

  ngOnInit(): void {
    const employee = this.employee();
    if (employee) {
      this.form.patchValue({
        firstName: employee.firstName,
        lastName: employee.lastName,
        departmentId: employee.departmentId,
        managerId: employee.managerId,
        salary: employee.salary
      });
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closed.emit();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.save.emit({
      firstName: value.firstName.trim(),
      lastName: value.lastName.trim(),
      departmentId: value.departmentId!,
      managerId: value.managerId,
      salary: value.salary!
    });
  }

  invalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }
}
