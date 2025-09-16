import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RagService } from '../../services/rag.service';
import { CodingSandboxComponent } from '../coding-sandbox/coding-sandbox.component';
import { SettingsService } from '../../services/settings.service';
import { WebLlmService } from '../../services/web-llm.service';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, CodingSandboxComponent],
})
export class AdminDashboardComponent {
  ragService = inject(RagService);
  settingsService = inject(SettingsService);
  webLlmService = inject(WebLlmService);

  newDocumentContent = signal('');
  
  availableVoices = signal<SpeechSynthesisVoice[]>([]);
  saveStatus = signal<'idle' | 'saving' | 'saved'>('idle');

  constructor() {
    this.loadVoices();
  }

  private loadVoices(): void {
    // getVoices() is often async, so we need to handle both immediate and delayed availability.
    const setVoices = () => {
      this.availableVoices.set(window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('en')));
    };

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      setVoices();
    } else {
      window.speechSynthesis.onvoiceschanged = setVoices;
    }
  }

  addDocument(): void {
    const content = this.newDocumentContent().trim();
    if (content) {
      this.ragService.addDocument(content);
      this.newDocumentContent.set('');
    }
  }

  onNewDocumentContentInput(event: Event): void {
    this.newDocumentContent.set((event.target as HTMLTextAreaElement).value);
  }

  saveSettings(): void {
    this.saveStatus.set('saving');

    // Validate the TTS voice currently in the service's state.
    const selectedVoiceUri = this.settingsService.defaultTtsVoiceUri();
    const voiceIsValid = this.availableVoices().some(v => v.voiceURI === selectedVoiceUri);
    
    if (!voiceIsValid && selectedVoiceUri !== '') {
      console.warn(`Selected TTS voice URI "${selectedVoiceUri}" is not available. Reverting to browser default before saving.`);
      this.settingsService.setDefaultTtsVoiceUri(''); // Update the service state to a valid one
    }

    // All other settings are already up-to-date in the service's signals.
    // We just need to persist them.
    this.settingsService.saveSettings();

    setTimeout(() => {
      this.saveStatus.set('saved');
      setTimeout(() => this.saveStatus.set('idle'), 2000);
    }, 1000);
  }
}
