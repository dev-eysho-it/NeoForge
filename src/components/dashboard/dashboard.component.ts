
import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PluginCardComponent } from '../plugin-card/plugin-card.component';
import { SystemInfoComponent } from '../system-info/system-info.component';
import { GeminiService } from '../../services/gemini.service';
import { Plugin } from '../../models/plugin.model';
import { HardwareStatusComponent } from '../hardware-status/hardware-status.component';
import { ResourceMonitorComponent } from '../resource-monitor/resource-monitor.component';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, PluginCardComponent, SystemInfoComponent, HardwareStatusComponent, ResourceMonitorComponent],
})
export class DashboardComponent {
  private geminiService = inject(GeminiService);
  
  report = signal<string>('');
  reportLoading = signal<boolean>(false);
  reportError = signal<string | null>(null);
  isReportWidgetCollapsed = signal(false);

  plugins = signal<Plugin[]>([
    { name: 'rs-graph-llm', description: 'Newly integrated graph-based LLM processing unit.', status: 'Active', version: '1.0.0', icon: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z' },
    { name: 'CyberLLM', description: 'Core language model interface for advanced text generation.', status: 'Active', version: '2.3.1', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
    { name: 'VideoForge', description: 'Real-time video stream analysis and synthesis.', status: 'Idle', version: '1.8.5', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
    { name: 'QuantumNet', description: 'Quantum-inspired neural network for complex problem solving.', status: 'Active', version: '0.9.2', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { name: 'VectorCore', description: 'High-dimensional vector database for similarity search.', status: 'Maintenance', version: '3.1.0', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2zm2 0h14v10H5V7z' },
    { name: 'WebCrawler', description: 'Autonomous agent for data extraction from web sources.', status: 'Active', version: '4.0.1', icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h4a2 2 0 002-2v-1a2 2 0 012-2h1.945C18.435 15.223 15.45 18 12 18s-6.435-2.777-7.945-7zM12 6c3.45 0 6.435 2.777 7.945 7H17a2 2 0 00-2-2h-1a2 2 0 01-2-2V8a2 2 0 00-2-2H9a2 2 0 00-2 2v1a2 2 0 01-2 2H4.055C5.565 8.777 8.55 6 12 6z' },
    { name: 'NeuralVision', description: 'Advanced image recognition and pattern detection module.', status: 'Idle', version: '2.5.0', icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0zM12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5z' },
    { name: 'AudioSynth', description: 'Generative audio synthesis for dynamic soundscapes.', status: 'Active', version: '1.2.3', icon: 'M5 3a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2H5zm11 11h-2a1 1 0 01-1-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1zm-4 0H8a1 1 0 01-1-1V9a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1z' },
    { name: 'DataFlow', description: 'Manages and orchestrates complex data processing pipelines.', status: 'Offline', version: '2.1.0', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
  ]);

  async generateReport() {
    this.reportLoading.set(true);
    this.reportError.set(null);
    this.report.set('');
    try {
      const result = await this.geminiService.generateSystemReport(this.plugins());
      this.report.set(result);
    } catch (error) {
      this.reportError.set('System analysis failed. Quantum core de-synced.');
    } finally {
      this.reportLoading.set(false);
    }
  }

  toggleReportWidget(): void {
    this.isReportWidgetCollapsed.update(v => !v);
  }
}
