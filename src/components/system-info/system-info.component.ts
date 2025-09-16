import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { SystemArchitectureComponent } from '../system-architecture/system-architecture.component';

type Tab = 'tasks' | 'stack' | 'architecture';

@Component({
  selector: 'app-system-info',
  templateUrl: './system-info.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SystemArchitectureComponent],
})
export class SystemInfoComponent {
  activeTab = signal<Tab>('tasks');
  isCollapsed = signal(false);

  selectTab(tab: Tab) {
    this.activeTab.set(tab);
  }

  toggleCollapse(): void {
    this.isCollapsed.update(v => !v);
  }
}