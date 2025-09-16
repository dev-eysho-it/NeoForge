import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';
import { WebLlmService } from './services/web-llm.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, HeaderComponent],
})
export class AppComponent implements OnInit {
  private webLlmService = inject(WebLlmService);

  ngOnInit(): void {
    // Eagerly initialize the WebLlmService after the root component has been initialized.
    // This is a robust pattern to ensure all services are fully available.
    this.webLlmService.initModel();
  }
}