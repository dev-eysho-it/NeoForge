import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Plugin } from '../../models/plugin.model';

@Component({
  selector: 'app-plugin-card',
  templateUrl: './plugin-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class PluginCardComponent {
  plugin = input.required<Plugin>();

  // Replaced computed signals with methods to fix the NG0203 injection context error.
  // This provides a more robust way to derive the classes in this specific environment.
  statusColor(): string {
    switch (this.plugin().status) {
      case 'Active':
        return 'bg-green-500';
      case 'Idle':
        return 'bg-yellow-500';
      case 'Maintenance':
        return 'bg-blue-500';
      case 'Offline':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  }

  statusTextColor(): string {
    switch (this.plugin().status) {
      case 'Active':
        return 'text-green-400';
      case 'Idle':
        return 'text-yellow-400';
      case 'Maintenance':
        return 'text-blue-400';
      case 'Offline':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  }
}
