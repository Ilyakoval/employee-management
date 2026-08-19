import { Component, computed, effect, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { EmployeeStore } from '../../employee-store';
import { EmployeeNode, buildEmployeeForest } from '../../shared/employee-tree';

interface TreeRow {
  node: EmployeeNode;
  depth: number;
}

@Component({
  selector: 'app-org-page',
  imports: [DecimalPipe],
  templateUrl: './org-page.html',
  styleUrl: './org-page.scss'
})
export class OrgPage {
  readonly store = inject(EmployeeStore);

  readonly forest = computed(() => buildEmployeeForest(this.store.employees()));
  readonly expanded = signal<Set<number>>(new Set());

  private rootsInitialized = false;

  constructor() {
    // Expand the top-level managers once the data arrives.
    effect(() => {
      const roots = this.forest();
      if (!this.rootsInitialized && roots.length > 0) {
        this.rootsInitialized = true;
        this.expanded.set(new Set(roots.map(r => r.employee.id)));
      }
    });
  }

  /** The visible part of the forest, flattened for rendering. */
  readonly rows = computed<TreeRow[]>(() => {
    const out: TreeRow[] = [];
    const walk = (node: EmployeeNode, depth: number): void => {
      out.push({ node, depth });
      if (this.expanded().has(node.employee.id)) {
        node.children.forEach(child => walk(child, depth + 1));
      }
    };
    this.forest().forEach(root => walk(root, 0));
    return out;
  });

  toggle(id: number): void {
    this.expanded.update(set => {
      const next = new Set(set);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  expandAll(): void {
    const all = new Set<number>();
    const walk = (node: EmployeeNode): void => {
      all.add(node.employee.id);
      node.children.forEach(walk);
    };
    this.forest().forEach(walk);
    this.expanded.set(all);
  }

  collapseAll(): void {
    this.expanded.set(new Set());
  }
}
