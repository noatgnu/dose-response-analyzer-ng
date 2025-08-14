import { Component, computed, signal, effect } from '@angular/core';
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
  pendingColumnMapping = signal<ColumnMapping>({ compound: '', concentration: '', response: '', logTransformed: false });
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
    gridStyle: 'solid',
    groupAllCompounds: false
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
    
    // Sync pending values when service values change (e.g., auto-detection)
    effect(() => {
      const currentMapping = this.columnMapping();
      const currentConfig = this.plotConfig();
      
      // Update pending values if they're currently empty/default (indicating auto-detection happened)
      const pendingMapping = this.pendingColumnMapping();
      if (!pendingMapping.compound && currentMapping.compound) {
        console.log('Auto-detected column mapping, updating pending values');
        this.pendingColumnMapping.set(currentMapping);
      }
      
      // Always sync plot config if there are no pending changes
      if (!this.hasPendingChanges()) {
        this.pendingPlotConfig.set(currentConfig);
      }
    });
  }

  /**
   * Update pending column mapping (doesn't apply immediately)
   */
  updatePendingColumnMapping(field: keyof ColumnMapping, value: string | boolean): void {
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
    console.log('Applying changes:', this.pendingPlotConfig());
    
    // Only update column mapping if it actually changed
    const currentMapping = this.columnMapping();
    const pendingMapping = this.pendingColumnMapping();
    if (JSON.stringify(currentMapping) !== JSON.stringify(pendingMapping)) {
      console.log('Column mapping changed, updating');
      this.doseResponseService.updateColumnMapping(pendingMapping);
    } else {
      console.log('Column mapping unchanged, skipping');
    }
    
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
