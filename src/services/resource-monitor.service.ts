
import { Injectable, signal, OnDestroy } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ResourceMonitorService implements OnDestroy {
  cpuUsage = signal(0);
  memoryUsage = signal(0); // Represented as a percentage

  private intervalId: any;
  private baseCpu = 10;
  private baseMemory = 25;

  constructor() {
    this.startMonitoring();
  }

  private startMonitoring(): void {
    this.intervalId = setInterval(() => {
      // Simulate fluctuating CPU usage
      const cpuFluctuation = (Math.random() - 0.5) * 5;
      this.baseCpu = Math.max(5, Math.min(40, this.baseCpu + cpuFluctuation));
      this.cpuUsage.set(Math.round(this.baseCpu + (Math.random() * 5)));

      // Simulate fluctuating Memory usage
      const memoryFluctuation = (Math.random() - 0.5) * 4;
      this.baseMemory = Math.max(20, Math.min(60, this.baseMemory + memoryFluctuation));
      this.memoryUsage.set(Math.round(this.baseMemory + (Math.random() * 4)));
    }, 2000);
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}
