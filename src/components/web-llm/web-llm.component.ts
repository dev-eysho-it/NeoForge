import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  ViewChild,
  ElementRef,
  afterNextRender,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { WebLlmService, ChatMessage, PerformanceReport } from '../../services/web-llm.service';
import { SettingsService } from '../../services/settings.service';
import { RagService } from '../../services/rag.service';
// Note: Using a simple markdown-to-html library. Assume it's loaded globally.
// In a real app, you would import it from node_modules.
declare var marked: {
  parse(markdown: string): string;
};

interface ChatUiMessage extends ChatMessage {
  id: number;
  isStreaming?: boolean;
  htmlContent?: SafeHtml;
}

@Component({
  selector: 'app-web-llm',
  templateUrl: './web-llm.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
})
export class WebLlmComponent {
  webLlmService = inject(WebLlmService);
  private settingsService = inject(SettingsService);
  private ragService = inject(RagService);
  private sanitizer = inject(DomSanitizer);

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  @ViewChild('inputArea') private inputArea!: ElementRef<HTMLTextAreaElement>;

  messages = signal<ChatUiMessage[]>([]);
  userInput = signal('');
  performanceReport = signal<PerformanceReport | null>(null);
  
  // Settings
  isSettingsVisible = signal(false);
  temperature = signal(0.7);
  top_p = signal(0.95);
  useRag = signal(false);

  selectedModelName = computed(() => {
    const modelId = this.webLlmService.selectedModelId();
    if (!modelId) return 'No Model Selected';
    return this.webLlmService.availableModels().find(m => m.id === modelId)?.name ?? modelId;
  });

  constructor() {
    afterNextRender(() => {
      // Auto-adjust textarea height
      if (this.inputArea?.nativeElement) {
        this.inputArea.nativeElement.addEventListener('input', () => this.autoResizeTextarea());
      }
    });
  }

  toggleSettings(): void {
    this.isSettingsVisible.update(v => !v);
  }

  handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  private autoResizeTextarea(): void {
    const textarea = this.inputArea.nativeElement;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }
  
  private parseAndSanitize(content: string): SafeHtml {
    try {
      // Use marked if available, otherwise just wrap in pre for safety
      const html = typeof marked !== 'undefined' ? marked.parse(content) : `<pre>${content}</pre>`;
      return this.sanitizer.bypassSecurityTrustHtml(html);
    } catch (e) {
      console.error('Markdown parsing error:', e);
      return this.sanitizer.bypassSecurityTrustHtml(`<pre>${content}</pre>`);
    }
  }

  private scrollToBottom(): void {
    afterNextRender(() => {
      try {
        if (this.scrollContainer?.nativeElement) {
          this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
        }
      } catch (err) {}
    });
  }

  async sendMessage(): Promise<void> {
    const text = this.userInput().trim();
    if (!text || !this.webLlmService.isReady() || this.webLlmService.isGenerating()) return;

    this.userInput.set('');
    this.autoResizeTextarea();

    const userMessage: ChatUiMessage = {
      id: Date.now(),
      role: 'user',
      parts: [{ content: text, type: 'text' }],
      timestamp: new Date(),
    };
    userMessage.htmlContent = this.parseAndSanitize(text);
    this.messages.update(m => [...m, userMessage]);
    this.scrollToBottom();

    let context = '';
    if (this.useRag()) {
      const searchResults = this.ragService.search(text);
      if (searchResults.length > 0) {
        context = 'Use the following context to answer the question:\n\n---\n\n' + searchResults.join('\n\n') + '\n\n---\n\n';
      }
    }
    const prompt = context + text;
    
    const history: ChatMessage[] = this.messages().map(m => ({
        role: m.role,
        parts: m.parts,
        timestamp: m.timestamp
    }));
    // We replace the last user message with our augmented RAG prompt
    history.pop();
    history.push({
      role: 'user',
      parts: [{ content: prompt, type: 'text' }],
      timestamp: userMessage.timestamp,
    });


    const assistantMessage: ChatUiMessage = {
      id: Date.now() + 1,
      role: 'assistant',
      parts: [{ content: '', type: 'text' }],
      timestamp: new Date(),
      isStreaming: true,
    };
    assistantMessage.htmlContent = this.parseAndSanitize('...');
    this.messages.update(m => [...m, assistantMessage]);
    this.scrollToBottom();

    let currentResponse = '';
    const onDelta = (delta: string) => {
      currentResponse += delta;
      this.messages.update(msgs =>
        msgs.map(m =>
          m.id === assistantMessage.id
            ? { ...m, parts: [{ content: currentResponse, type: 'text' }], htmlContent: this.parseAndSanitize(currentResponse + ' █') }
            : m
        )
      );
      this.scrollToBottom();
    };

    const onComplete = async () => {
      this.messages.update(msgs =>
        msgs.map(m =>
          m.id === assistantMessage.id
            ? { ...m, isStreaming: false, htmlContent: this.parseAndSanitize(currentResponse) }
            : m
        )
      );
      this.performanceReport.set(await this.webLlmService.getPerformanceStats());
    };
    
    await this.webLlmService.generate(
      history,
      { temperature: this.temperature(), top_p: this.top_p() },
      onDelta,
      onComplete
    );
  }

  interrupt(): void {
    this.webLlmService.interrupt();
  }

  async resetChat(): Promise<void> {
    await this.webLlmService.resetChat();
    this.messages.set([]);
    this.performanceReport.set(null);
  }
}
