import { Component, ChangeDetectionStrategy, signal, afterNextRender, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

declare var Prism: any;

type FileType = 'html' | 'css' | 'js';
type FileSystemItem = {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileSystemItem[];
};

@Component({
  selector: 'app-coding-sandbox',
  templateUrl: './coding-sandbox.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
})
export class CodingSandboxComponent {
  @ViewChild('editorTextarea') editorTextarea!: ElementRef<HTMLTextAreaElement>;
  // FIX: Removed malformed decorator-like line that was causing a compile error.
  @ViewChild('previewFrame') previewFrame!: ElementRef<HTMLIFrameElement>;

  private sanitizer = inject(DomSanitizer);

  activeTab = signal<'editor' | 'explorer' | 'shell'>('explorer');
  
  // File System State
  fileSystem = signal<FileSystemItem[]>([]);
  fileContents = signal<Map<string, string>>(new Map());
  activeFileId = signal<string | null>(null);
  
  // UI State for creating new items
  isCreating = signal<{ type: 'file' | 'folder', parentId: string | null } | null>(null);
  newItemName = signal('');
  itemPendingDeletion = signal<string | null>(null);

  // Terminal State
  terminalOutput = signal<string[]>(['NeuroForge Sandbox Terminal [Version 1.0.0]']);
  terminalHistory = signal<string[]>([]);
  historyIndex = signal<number>(-1);
  terminalInput = signal('');

  // Live Preview
  safeSrcDoc = signal<SafeHtml>('');
  
  private readonly fsKey = 'neuroforge_sandbox_fs';
  private readonly contentKey = 'neuroforge_sandbox_content';
  private readonly historyKey = 'neuroforge_sandbox_history';

  constructor() {
    this.loadFromStorage();
    if (this.fileSystem().length === 0) {
      this.initializeDefaultFiles();
    }
    if (this.activeFileId() === null && this.fileSystem().length > 0) {
      this.selectFile(this.fileSystem()[0].id);
    }
    
    afterNextRender(() => {
        this.highlightCode();
    });
  }
  
  private initializeDefaultFiles(): void {
    const fs: FileSystemItem[] = [
      { id: 'index.html', name: 'index.html', type: 'file' },
      { id: 'style.css', name: 'style.css', type: 'file' },
      { id: 'script.js', name: 'script.js', type: 'file' },
    ];
    const contents = new Map<string, string>();
    contents.set('index.html', `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sandbox</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <h1>Hello, NeuroForge!</h1>
    <script src="script.js"></script>
</body>
</html>`);
    contents.set('style.css', `body {
    font-family: sans-serif;
    background-color: #1a1a2e;
    color: #e0e1dd;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
}`);
    contents.set('script.js', `console.log('Sandbox script loaded.');
document.querySelector('h1').addEventListener('click', () => {
    alert('Header clicked!');
});`);
    this.fileSystem.set(fs);
    this.fileContents.set(contents);
    this.saveToStorage();
  }

  // --- Storage ---
  private loadFromStorage(): void {
    try {
      const storedFs = localStorage.getItem(this.fsKey);
      const storedContent = localStorage.getItem(this.contentKey);
      const storedHistory = localStorage.getItem(this.historyKey);
      
      if (storedFs) this.fileSystem.set(JSON.parse(storedFs));
      if (storedContent) this.fileContents.set(new Map(JSON.parse(storedContent)));
      if (storedHistory) this.terminalHistory.set(JSON.parse(storedHistory));

    } catch (e) {
      console.error('Failed to load sandbox state from localStorage.', e);
      this.fileSystem.set([]);
      this.fileContents.set(new Map());
      this.terminalHistory.set([]);
    }
  }

  private saveToStorage(): void {
    localStorage.setItem(this.fsKey, JSON.stringify(this.fileSystem()));
    localStorage.setItem(this.contentKey, JSON.stringify(Array.from(this.fileContents().entries())));
  }
  
  private saveHistoryToStorage(): void {
      localStorage.setItem(this.historyKey, JSON.stringify(this.terminalHistory()));
  }

  // --- File Management ---
  selectFile(id: string): void {
    const file = this.findItemById(this.fileSystem(), id);
    if (file && file.type === 'file') {
      this.activeFileId.set(id);
      this.activeTab.set('editor');
      this.highlightCode();
    }
  }

  startCreating(type: 'file' | 'folder', parentId: string | null = null): void {
    this.isCreating.set({ type, parentId });
    this.newItemName.set('');
  }
  
  confirmCreation(): void {
    const creationState = this.isCreating();
    if (!creationState) return;
    
    const name = this.newItemName().trim();
    if (!name) return;

    const newItem: FileSystemItem = {
      id: `${creationState.parentId || 'root'}_${Date.now()}_${name}`,
      name,
      type: creationState.type,
      children: creationState.type === 'folder' ? [] : undefined,
    };
    
    if(creationState.type === 'file') {
        this.fileContents.update(map => map.set(newItem.id, ''));
    }

    this.fileSystem.update(fs => this.addItemToFs(fs, newItem, creationState.parentId));
    this.saveToStorage();
    this.isCreating.set(null);
  }

  cancelCreation(): void {
    this.isCreating.set(null);
  }

  deleteItem(id: string): void {
    this.itemPendingDeletion.set(id);
  }

  confirmDelete(): void {
      const id = this.itemPendingDeletion();
      if (!id) return;
      this.fileSystem.update(fs => this.removeItemFromFs(fs, id));
      this.fileContents.update(map => {
          map.delete(id);
          // Also delete children if it was a folder
          // (This is a simplified version, a real implementation would need recursion)
          return map;
      });
      if (this.activeFileId() === id) {
          this.activeFileId.set(null);
      }
      this.saveToStorage();
      this.itemPendingDeletion.set(null);
  }

  cancelDelete(): void {
      this.itemPendingDeletion.set(null);
  }

  // --- File System Helpers (simplified for one level) ---
  private findItemById(items: FileSystemItem[], id: string): FileSystemItem | null {
      return items.find(item => item.id === id) || null;
  }
  private addItemToFs(items: FileSystemItem[], newItem: FileSystemItem, parentId: string | null): FileSystemItem[] {
      // Simplified: only adds to root
      return [...items, newItem];
  }
  private removeItemFromFs(items: FileSystemItem[], id: string): FileSystemItem[] {
      return items.filter(item => item.id !== id);
  }
  
  getFileIcon(name: string): string {
    if (name.endsWith('.html')) return 'html';
    if (name.endsWith('.css')) return 'css';
    if (name.endsWith('.js')) return 'js';
    return 'file';
  }


  // --- Editor ---
  onCodeChange(newCode: string): void {
    const activeId = this.activeFileId();
    if (activeId) {
      this.fileContents.update(map => map.set(activeId, newCode));
      this.saveToStorage();
      this.highlightCode();
    }
  }

  private highlightCode(): void {
    afterNextRender(() => {
        if (this.editorTextarea) {
            this.syncScroll();
        }
    });
  }

  syncScroll(): void {
    if (this.editorTextarea) {
      const textarea = this.editorTextarea.nativeElement;
      const pre = textarea.previousElementSibling;
      if (pre) {
        pre.scrollTop = textarea.scrollTop;
        pre.scrollLeft = textarea.scrollLeft;
      }
    }
  }
  
  getActiveContent(): string {
    const id = this.activeFileId();
    return id ? this.fileContents().get(id) || '' : '';
  }

  getActiveLanguage(): string {
    const id = this.activeFileId();
    const file = id ? this.findItemById(this.fileSystem(), id) : null;
    if (!file) return 'plaintext';
    
    if (file.name.endsWith('.html')) return 'html';
    if (file.name.endsWith('.css')) return 'css';
    if (file.name.endsWith('.js')) return 'javascript';
    return 'plaintext';
  }
  
  getHighlightedHtml(): SafeHtml {
    const code = this.getActiveContent();
    const language = this.getActiveLanguage();
    const highlighted = Prism.highlight(code, Prism.languages[language], language);
    return this.sanitizer.bypassSecurityTrustHtml(highlighted);
  }
  
  
  // --- Terminal ---
  onTerminalInput(event: Event): void {
      this.terminalInput.set((event.target as HTMLInputElement).value);
  }

  handleTerminalKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.executeCommand();
    } else if (event.key === 'ArrowUp') {
      this.navigateHistory('up');
    } else if (event.key === 'ArrowDown') {
      this.navigateHistory('down');
    }
  }
  
  private executeCommand(): void {
    const command = this.terminalInput().trim();
    if (!command) return;

    this.terminalOutput.update(o => [...o, `> ${command}`]);
    this.terminalHistory.update(h => [command, ...h].slice(0, 50));
    this.saveHistoryToStorage();
    this.historyIndex.set(-1);

    switch (command.toLowerCase()) {
      case 'run':
        this.runProject();
        break;
      case 'clear':
        this.terminalOutput.set([]);
        break;
      case 'help':
        this.terminalOutput.update(o => [...o, 'Available commands: run, clear, help']);
        break;
      default:
        this.terminalOutput.update(o => [...o, `Command not found: ${command}`]);
    }
    this.terminalInput.set('');
  }
  
  private navigateHistory(direction: 'up' | 'down'): void {
      const history = this.terminalHistory();
      if (history.length === 0) return;

      let newIndex = this.historyIndex();
      if (direction === 'up') {
          newIndex = Math.min(newIndex + 1, history.length - 1);
      } else {
          newIndex = Math.max(newIndex - 1, -1);
      }
      this.historyIndex.set(newIndex);
      this.terminalInput.set(newIndex >= 0 ? history[newIndex] : '');
  }
  
  private runProject(): void {
    this.terminalOutput.update(o => [...o, 'Building project...']);
    const html = this.fileContents().get('index.html') || '';
    const css = this.fileContents().get('style.css') || '';
    const js = this.fileContents().get('script.js') || '';
    
    const srcDoc = `
      <html>
        <head>
          <style>${css}</style>
        </head>
        <body>
          ${html}
          <script>${js}</script>
        </body>
      </html>
    `;
    this.safeSrcDoc.set(this.sanitizer.bypassSecurityTrustHtml(srcDoc));
    this.terminalOutput.update(o => [...o, 'Build successful. Preview updated.']);
  }

  // --- AI Agent Interaction ---
  public executeAgentCode(code: string): { success: boolean, message: string } {
    if (!this.previewFrame || !this.previewFrame.nativeElement.contentWindow) {
      return { success: false, message: 'Preview frame not available.' };
    }
    try {
      // FIX: Cast contentWindow to 'any' to allow calling the 'eval' function,
      // which is not part of the standard 'Window' type definition.
      (this.previewFrame.nativeElement.contentWindow as any).eval(code);
      return { success: true, message: 'Code executed in preview.' };
    } catch (e) {
      return { success: false, message: `Execution error: ${(e as Error).message}` };
    }
  }
}