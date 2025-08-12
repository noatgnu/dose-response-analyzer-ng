import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { NgxColorsModule } from 'ngx-colors';

import { DoseResponseService, ColumnMapping, PlotConfig } from '../../services/dose-response.service';

@Component({
  selector: 'app-sidebar-panel',
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatSliderModule,
    MatCheckboxModule,
    MatInputModule,
    MatDividerModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    NgxColorsModule
  ],
  templateUrl: './sidebar-panel.html',
  styleUrl: './sidebar-panel.scss'
})
export class SidebarPanelComponent {
  // Get computed properties from service
  availableColumns = computed(() => this.doseResponseService.getAvailableColumns());
  columnMapping;
  plotConfig;
  sampleFiles;
  hasData = computed(() => this.doseResponseService.rawData() !== null);
  
  // Local state for pending changes
  pendingColumnMapping = signal<ColumnMapping>({ compound: '', concentration: '', response: '' });
  pendingPlotConfig = signal<PlotConfig>({
    plotWidth: 800,
    plotHeight: 600,
    dataPointSize: 8,
    dataPointAlpha: 0.8,
    dataPointColor: '#1f77b4',
    lineThickness: 2,
    lineAlpha: 0.9,
    lineColor: '#ff7f0e',
    showIc50Lines: true,
    showDmaxLines: false,
    gridEnabled: true,
    ic50VerticalLineColor: '#d62728',
    ic50HorizontalLineColor: '#d62728',
    observedDmaxColor: '#2ca02c',
    predictedDmaxColor: '#ff7f0e',
    plotStyle: 'seaborn-v0_8',
    pointMarkerStyle: 'circle',
    lineStyle: 'solid',
    legendPosition: 'upper right',
    textSize: 12,
    titleSize: 16,
    gridAlpha: 0.3,
    gridStyle: 'solid'
  });
  
  hasPendingChanges = signal(false);

  constructor(
    private doseResponseService: DoseResponseService
  ) {
    this.columnMapping = this.doseResponseService.columnMapping;
    this.plotConfig = this.doseResponseService.plotConfig;
    this.sampleFiles = this.doseResponseService.sampleFiles;
    
    // Initialize pending values with current values
    this.pendingColumnMapping.set(this.columnMapping());
    this.pendingPlotConfig.set(this.plotConfig());
  }

  /**
   * Update pending column mapping (doesn't apply immediately)
   */
  updatePendingColumnMapping(field: keyof ColumnMapping, value: string): void {
    const current = this.pendingColumnMapping();
    this.pendingColumnMapping.set({ ...current, [field]: value });
    this.hasPendingChanges.set(true);
  }

  /**
   * Update pending plot configuration (doesn't apply immediately)
   */
  updatePendingPlotConfig(field: keyof PlotConfig, value: any): void {
    const current = this.pendingPlotConfig();
    this.pendingPlotConfig.set({ ...current, [field]: value });
    this.hasPendingChanges.set(true);
  }
  
  /**
   * Apply all pending changes to the service
   */
  applyChanges(): void {
    this.doseResponseService.updateColumnMapping(this.pendingColumnMapping());
    this.doseResponseService.updatePlotConfig(this.pendingPlotConfig());
    this.hasPendingChanges.set(false);
  }
  
  /**
   * Reset pending changes to current service values
   */
  resetChanges(): void {
    this.pendingColumnMapping.set(this.columnMapping());
    this.pendingPlotConfig.set(this.plotConfig());
    this.hasPendingChanges.set(false);
  }

  /**
   * Load sample file
   */
  async loadSampleFile(fileName: string): Promise<void> {
    await this.doseResponseService.loadData(fileName);
    // Reset pending values when new data is loaded
    this.pendingColumnMapping.set(this.columnMapping());
    this.pendingPlotConfig.set(this.plotConfig());
    this.hasPendingChanges.set(false);
  }
}
