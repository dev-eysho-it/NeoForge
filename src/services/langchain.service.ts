import { Injectable, inject } from '@angular/core';
import { WebLlmService } from './web-llm.service';
import { RagService } from './rag.service';
import { ChatMessage } from './web-llm.service';

/**
 * A service to orchestrate more complex AI interactions,
 * simulating patterns often found in libraries like LangChain.
 */
@Injectable({ providedIn: 'root' })
export class LangchainService {
  private webLlmService = inject(WebLlmService);
  private ragService = inject(RagService);

  /**
   * Asks a question that is first augmented with context from the RAG service.
   * This is a simple implementation of the Retrieval-Augmented Generation pattern.
   * 
   * @param question The user's question.
   * @param onDelta A callback function that receives streaming text deltas.
   * @param onComplete A callback function that is called when generation is finished.
   */
  async askWithContext(
    question: string, 
    onDelta: (delta: string) => void, 
    onComplete: () => void
  ): Promise<void> {
    if (!this.webLlmService.isReady()) {
      onDelta('WebLLM model is not ready. Please load a model first.');
      onComplete();
      return;
    }

    // 1. Retrieve relevant context
    const contextChunks = this.ragService.search(question, 3);
    
    let prompt = question;
    if (contextChunks.length > 0) {
      const context = contextChunks.join('\n\n---\n\n');
      prompt = `Based on the following context, please answer the question.
If the context does not contain the answer, say so.

CONTEXT:
${context}

QUESTION:
${question}`;
    }

    // 2. Generate a response using the augmented prompt
    const messages: ChatMessage[] = [{
      role: 'user',
      parts: [{ content: prompt, type: 'text' }],
      timestamp: new Date()
    }];
    
    // For this service, we'll use default generation parameters.
    const defaultConfig = { temperature: 0.5, top_p: 0.95 };

    await this.webLlmService.generate(
        messages, 
        defaultConfig, 
        onDelta, 
        onComplete
    );
  }
}
