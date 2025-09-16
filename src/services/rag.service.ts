import { Injectable, signal } from '@angular/core';

export interface Document {
  id: number;
  content: string;
  chunks: string[];
}

@Injectable({ providedIn: 'root' })
export class RagService {
  private readonly storageKey = 'neuroforge_rag_documents';
  documents = signal<Document[]>([]);

  constructor() {
    this.loadFromStorage();
    if (this.documents().length === 0) {
      this.initializeDefaultDocuments();
    }
  }

  private initializeDefaultDocuments(): void {
    const defaultDocContent = `
A recent Hacker News thread (item?id=42973769) discussed the WebLLM project, which enables running large language models directly in the browser using WebGPU.
Key takeaways from the discussion include the significant privacy benefits, as no user data needs to be sent to a server.
Commenters highlighted the potential for offline-first AI applications and the elimination of server-side inference costs.
However, limitations were also noted, such as the performance dependency on the user's hardware and the current requirement for a browser supporting WebGPU.
There was excitement around the feasibility of running smaller, high-performance models like Phi-3 Mini and TinyLlama, making client-side AI a practical reality for many use cases.
    `.trim();
    this.addDocument(defaultDocContent);
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.documents.set(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load documents from storage', e);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.documents()));
    } catch (e) {
      console.error('Failed to save documents to storage', e);
    }
  }

  addDocument(content: string): void {
    if (!content.trim()) return;
    const newDoc: Document = {
      id: Date.now(),
      content,
      chunks: this.chunkText(content),
    };
    this.documents.update(docs => [...docs, newDoc]);
    this.saveToStorage();
  }

  deleteDocument(id: number): void {
    this.documents.update(docs => docs.filter(doc => doc.id !== id));
    this.saveToStorage();
  }

  // Simple chunking strategy
  private chunkText(text: string, chunkSize = 200, overlap = 50): string[] {
    const chunks: string[] = [];
    let i = 0;
    while (i < text.length) {
      const end = Math.min(i + chunkSize, text.length);
      chunks.push(text.substring(i, end));
      i += chunkSize - overlap;
    }
    return chunks;
  }

  // Simple keyword-based search to simulate vector search
  search(query: string, topK = 3): string[] {
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    if (queryWords.length === 0) return [];

    const scoredChunks = this.documents()
      .flatMap(doc => doc.chunks)
      .map(chunk => {
        const score = queryWords.reduce((acc, word) => {
          if (chunk.toLowerCase().includes(word)) {
            return acc + 1;
          }
          return acc;
        }, 0);
        return { chunk, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score);

    return scoredChunks.slice(0, topK).map(item => item.chunk);
  }
}
