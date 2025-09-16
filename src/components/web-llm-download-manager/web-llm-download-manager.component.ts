import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WebLlmService } from '../../services/web-llm.service';
import { SettingsService } from '../../services/settings.service';
import { ModelRecord } from '@mlc-ai/web-llm';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-web-llm-download-manager',
  templateUrl: './web-llm-download-manager.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
})
export class WebLlmDownloadManagerComponent {
  webLlmService = inject(WebLlmService);
  settingsService = inject(SettingsService);

  isAddingModel = signal(false);
  newModelUrl = signal('');
  newModelId = signal('');
  newModelLibUrl = signal('');

  getRoundedEtr(): number | null {
    const progress = this.webLlmService.detailedProgress();
    if (progress && progress.etr > 0) {
      return Math.round(progress.etr);
    }
    return null;
  }

  triggerDownload(modelId: string): void {
    this.webLlmService.loadModel(modelId);
  }

  toggleAutoLoad(): void {
    this.settingsService.setAutoLoadDefaultModel(!this.settingsService.autoLoadDefaultModel());
    this.settingsService.saveSettings();
  }

  addModel(): void {
    try {
        const newModelRecord: ModelRecord = {
            model: this.newModelUrl().trim(),
            model_id: this.newModelId().trim(),
            model_lib: this.newModelLibUrl().trim(),
        };
        this.webLlmService.addModel(newModelRecord);
        // Reset form
        this.newModelUrl.set('');
        this.newModelId.set('');
        this.newModelLibUrl.set('');
        this.isAddingModel.set(false);
    } catch (e) {
        alert((e as Error).message);
    }
  }

  removeModel(modelId: string): void {
    if (confirm(`Are you sure you want to remove the custom model "${modelId}"? This action cannot be undone.`)) {
        this.webLlmService.removeModel(modelId);
    }
  }
}
