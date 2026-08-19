import { Component, HostListener, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Employee } from '../models';
import { FocusTrap } from '../shared/focus-trap';
import { Select, SelectOption } from '../shared/select';

/**
 * Delete confirmation. When the employee manages other people, the dialog
 * turns into a reassignment wizard: his subordinates must get a new manager
 * (or none) before he can be deleted.
 */
@Component({
  selector: 'app-delete-dialog',
  imports: [FormsModule, FocusTrap, Select],
  templateUrl: './delete-dialog.html',
  styleUrl: './delete-dialog.scss'
})
export class DeleteDialog {
  readonly employee = input.required<Employee>();
  readonly allEmployees = input.required<Employee[]>();
  readonly busy = input(false);
  readonly error = input<string | null>(null);

  /** Emits the reassignment target ('none' | employee id) or null when no reassignment is needed. */
  readonly confirmed = output<number | 'none' | null>();
  readonly closed = output<void>();

  readonly reassignTo = signal<number | null>(null);

  /** Managers get a two-step flow: choose a new manager, then confirm the summary. */
  readonly step = signal<'choose' | 'confirm'>('choose');

  readonly subordinates = computed(() =>
    this.allEmployees().filter(e => e.managerId === this.employee().id)
  );

  readonly reassignToName = computed(() => {
    const id = this.reassignTo();
    if (id === null) {
      return null;
    }
    const target = this.allEmployees().find(e => e.id === id);
    return target ? `${target.firstName} ${target.lastName}`.trim() : null;
  });

  readonly reassignOptions = computed<SelectOption[]>(() => {
    const deletedId = this.employee().id;
    const options = this.allEmployees()
      .filter(e => e.id !== deletedId)
      .map(e => ({ value: e.id as number | null, label: `${e.firstName} ${e.lastName}`.trim() }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return [{ value: null, label: '— No manager —' }, ...options];
  });

  readonly fullName = computed(() =>
    `${this.employee().firstName} ${this.employee().lastName}`.trim()
  );

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closed.emit();
  }

  confirm(): void {
    if (this.subordinates().length === 0) {
      this.confirmed.emit(null);
      return;
    }
    if (this.step() === 'choose') {
      // First step only picks the new manager; the summary must be confirmed.
      this.step.set('confirm');
      return;
    }
    this.confirmed.emit(this.reassignTo() ?? 'none');
  }

  back(): void {
    if (!this.busy()) {
      this.step.set('choose');
    }
  }
}
