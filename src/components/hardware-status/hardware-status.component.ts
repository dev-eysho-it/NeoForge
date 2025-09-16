import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GpuService } from '../../services/gpu.service';

@Component({
  selector: 'app-hardware-status',
  templateUrl: './hardware-status.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class HardwareStatusComponent {
  gpuService = inject(GpuService);
}
