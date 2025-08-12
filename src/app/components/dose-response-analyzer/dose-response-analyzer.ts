import { Component, computed} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { DoseResponseService } from '../../services/dose-response.service';
import { SidebarPanelComponent } from '../sidebar-panel/sidebar-panel';
import { FileUploadComponent } from '../file-upload/file-upload';
import { DataPreviewComponent } from '../data-preview/data-preview';
import { CompoundPlot } from '../compound-plot/compound-plot';
import { ResultsTable } from '../results-table/results-table';
import { ThemeToggle } from '../theme-toggle/theme-toggle';

@Component({
  selector: 'app-dose-response-analyzer',
  imports: [
    CommonModule,
    MatToolbarModule,
    MatSidenavModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatTabsModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatTooltipModule,
    SidebarPanelComponent,
    FileUploadComponent,
    DataPreviewComponent,
    CompoundPlot,
    ResultsTable,
    ThemeToggle
  ],
  templateUrl: './dose-response-analyzer.html',
  styleUrl: './dose-response-analyzer.scss'
})
export class DoseResponseAnalyzerComponent {
  // Computed properties from service
  hasData = computed(() => this.doseResponseService.rawData() !== null);
  hasResults = computed(() => this.doseResponseService.analysisResults() !== null);
  isAnalyzing;
  errorMessage;
  analysisProgress;

  constructor(
    public doseResponseService: DoseResponseService
  ) {
    this.isAnalyzing = this.doseResponseService.isAnalyzing;
    this.errorMessage = this.doseResponseService.errorMessage;
    this.analysisProgress = this.doseResponseService.analysisProgress;
  }

  /**
   * Run the dose-response analysis
   */
  async runAnalysis(): Promise<void> {
    await this.doseResponseService.runAnalysis();
  }

  /**
   * Reset all data and analysis
   */
  resetAnalysis(): void {
    this.doseResponseService.reset();
  }
}
