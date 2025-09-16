import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly textModelKey = 'neuroforge_setting_text_model';
  private readonly embeddingModelKey = 'neuroforge_setting_embedding_model';
  private readonly ttsVoiceKey = 'neuroforge_setting_tts_voice';
  private readonly autoLoadKey = 'neuroforge_setting_auto_load';

  // --- Signals for live state ---
  defaultTextModelId = signal<string>('');
  defaultEmbeddingModelId = signal<string>('');
  defaultTtsVoiceUri = signal<string>('');
  autoLoadDefaultModel = signal<boolean>(true);
  
  constructor() {
    this.loadSettings();
  }

  private loadSettings(): void {
    this.defaultTextModelId.set(localStorage.getItem(this.textModelKey) || 'Llama-3-8B-Instruct-q4f32_1-MLC');
    this.defaultEmbeddingModelId.set(localStorage.getItem(this.embeddingModelKey) || 'all-MiniLM-L6-v2');
    this.defaultTtsVoiceUri.set(localStorage.getItem(this.ttsVoiceKey) || '');
    
    const autoLoad = localStorage.getItem(this.autoLoadKey);
    // Default to true if the setting doesn't exist yet
    this.autoLoadDefaultModel.set(autoLoad === null ? true : autoLoad === 'true');
  }

  // --- Public setters for UI binding ---
  setDefaultTextModelId(id: string): void {
    this.defaultTextModelId.set(id);
  }

  setDefaultEmbeddingModelId(id: string): void {
    this.defaultEmbeddingModelId.set(id);
  }

  setDefaultTtsVoiceUri(uri: string): void {
    this.defaultTtsVoiceUri.set(uri);
  }

  setAutoLoadDefaultModel(value: boolean): void {
    this.autoLoadDefaultModel.set(value);
  }

  // --- Explicit save method ---
  saveSettings(): void {
    localStorage.setItem(this.textModelKey, this.defaultTextModelId());
    localStorage.setItem(this.embeddingModelKey, this.defaultEmbeddingModelId());
    localStorage.setItem(this.ttsVoiceKey, this.defaultTtsVoiceUri());
    localStorage.setItem(this.autoLoadKey, String(this.autoLoadDefaultModel()));
  }
}