
import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResourceMonitorService } from '../../services/resource-monitor.service';

@Component({
  selector: 'app-resource-monitor',
  templateUrl: './resource-monitor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class ResourceMonitorComponent {
  resourceMonitorService = inject(ResourceMonitorService);
}
