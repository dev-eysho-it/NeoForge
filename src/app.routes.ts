import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { WebLlmComponent } from './components/web-llm/web-llm.component';
import { WebLlmDownloadManagerComponent } from './components/web-llm-download-manager/web-llm-download-manager.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';

export const APP_ROUTES: Routes = [
  { path: 'dashboard', component: DashboardComponent, title: 'NeuroForge Dashboard' },
  { path: 'web-llm', component: WebLlmComponent, title: 'NeuroForge WebLLM' },
  { path: 'model-manager', component: WebLlmDownloadManagerComponent, title: 'NeuroForge Model Manager' },
  { path: 'admin', component: AdminDashboardComponent, title: 'NeuroForge Admin' },
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: '/dashboard' }
];