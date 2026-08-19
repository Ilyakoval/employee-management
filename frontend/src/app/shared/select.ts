import {
  Component,
  ElementRef,
  HostListener,
  computed,
  forwardRef,
  inject,
  input,
  signal
} from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SelectOption {
  value: number | null;
  label: string;
}

/**
 * Custom dropdown replacing the native <select>: the native popup cannot be
 * styled, grows unbounded with long option lists and (on macOS) is not
 * anchored under the field. Supports search, keyboard navigation and works
 * with both ngModel and reactive forms.
 */
@Component({
  selector: 'app-select',
  imports: [FormsModule],
  templateUrl: './select.html',
  styleUrl: './select.scss',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Select), multi: true }
  ]
})
export class Select implements ControlValueAccessor {
  readonly options = input.required<SelectOption[]>();
  readonly placeholder = input('Select…');
  readonly selectAriaLabel = input<string | null>(null);

  readonly open = signal(false);
  readonly query = signal('');
  readonly value = signal<number | null>(null);
  readonly activeIndex = signal(-1);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private onChange: (value: number | null) => void = () => {};
  private onTouched: () => void = () => {};

  readonly searchable = computed(() => this.options().length > 8);

  readonly filteredOptions = computed(() => {
    const needle = this.query().trim().toLowerCase();
    return needle
      ? this.options().filter(o => o.label.toLowerCase().includes(needle))
      : this.options();
  });

  readonly selectedLabel = computed(
    () => this.options().find(o => o.value === this.value())?.label ?? null
  );

  writeValue(value: number | null): void {
    this.value.set(value);
  }

  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  toggle(): void {
    if (this.open()) {
      this.close();
    } else {
      this.query.set('');
      this.activeIndex.set(-1);
      this.open.set(true);
      // The search input renders on the next tick.
      setTimeout(() =>
        this.host.nativeElement.querySelector<HTMLInputElement>('.select-search input')?.focus()
      );
    }
  }

  close(): void {
    if (this.open()) {
      this.open.set(false);
      this.onTouched();
    }
  }

  choose(option: SelectOption): void {
    this.value.set(option.value);
    this.onChange(option.value);
    this.open.set(false);
    this.onTouched();
    this.host.nativeElement.querySelector<HTMLElement>('.select-trigger')?.focus();
  }

  onSearchChange(query: string): void {
    this.query.set(query);
    this.activeIndex.set(this.filteredOptions().length > 0 ? 0 : -1);
  }

  onKeydown(event: KeyboardEvent): void {
    if (!this.open()) {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        // Let Enter submit forms; only arrows open the list from the trigger.
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          this.toggle();
        }
      }
      return;
    }

    const options = this.filteredOptions();
    switch (event.key) {
      case 'Escape':
        event.stopPropagation(); // keep the parent dialog open
        this.close();
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.setActive(Math.min(this.activeIndex() + 1, options.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.setActive(Math.max(this.activeIndex() - 1, 0));
        break;
      case 'Enter':
        event.preventDefault();
        if (this.activeIndex() >= 0 && options[this.activeIndex()]) {
          this.choose(options[this.activeIndex()]);
        }
        break;
      case 'Tab':
        this.close();
        break;
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  private setActive(index: number): void {
    this.activeIndex.set(index);
    this.host.nativeElement
      .querySelectorAll<HTMLElement>('.select-options button')[index]
      ?.scrollIntoView({ block: 'nearest' });
  }
}
