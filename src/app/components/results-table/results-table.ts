import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatOptionModule } from '@angular/material/core';

import { DoseResponseService } from '../../services/dose-response.service';

@Component({
  selector: 'app-results-table',
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatSelectModule,
    MatFormFieldModule,
    MatOptionModule
  ],
  templateUrl: './results-table.html',
  styleUrl: './results-table.scss'
})
export class ResultsTable implements OnInit, OnDestroy {
  private doseResponseService = inject(DoseResponseService);
  private updateInterval?: number;
  
  displayedColumns = ['compound', 'model', 'ic50', 'rmse', 'aic', 'actions'];
  dataSource: any[] = [];
  exportFormat: string = 'csv';
  
  ngOnInit(): void {
    this.updateTable();
    
    // Set up periodic updates to check for new results
    this.updateInterval = window.setInterval(() => {
      this.updateTable();
    }, 1000);
  }
  
  ngOnDestroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
  
  private updateTable(): void {
    const results = this.doseResponseService.analysisResults();
    
    if (!results || !results.bestModels) {
      this.dataSource = [];
      return;
    }
    
    const bestModelsData = results.bestModels.toArray();
    
    this.dataSource = bestModelsData.map((modelData: any) => {
      const compoundResult = results.bestFittedModels[modelData.Compound];
      return {
        compound: modelData.Compound,
        model: modelData.Model,
        ic50: compoundResult?.modelResult?.ic50,
        rmse: modelData.RMSE,
        aic: modelData.AIC,
        compoundResult: compoundResult
      };
    });
  }
  
  exportCompoundData(element: any): void {
    const rawData = this.doseResponseService.rawData();
    const mapping = this.doseResponseService.columnMapping();
    
    if (!rawData) return;
    
    // Filter data for this compound
    const compoundData = rawData.filter(row => row[mapping.compound] === element.compound);
    
    if (compoundData.length === 0) return;
    
    // Create CSV content
    const headers = [mapping.compound, mapping.concentration, mapping.response];
    if (element.compoundResult) {
      headers.push('Predicted_Response');
    }
    
    const rows = [headers.join(',')];
    
    compoundData.forEach((row, index) => {
      const dataRow = [
        `"${row[mapping.compound]}"`,
        row[mapping.concentration],
        row[mapping.response]
      ];
      
      // Add predicted response if available
      if (element.compoundResult && element.compoundResult.modelResult.yPredicted && 
          element.compoundResult.modelResult.yPredicted[index] !== undefined) {
        dataRow.push(element.compoundResult.modelResult.yPredicted[index].toFixed(6));
      }
      
      rows.push(dataRow.join(','));
    });
    
    const csvContent = rows.join('\n');
    
    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${element.compound}-data.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }
  
  exportBestModels(format: string = 'csv'): void {
    const results = this.doseResponseService.analysisResults();
    if (!results) return;
    
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    
    if (format === 'csv') {
      const headers = ['Compound', 'Model', 'IC50', 'RMSE', 'AIC'];
      const rows = [headers.join(',')];
      
      this.dataSource.forEach(row => {
        rows.push([
          `"${row.compound}"`,
          `"${row.model}"`,
          row.ic50?.toFixed(6) || 'N/A',
          row.rmse?.toFixed(6) || 'N/A',
          row.aic?.toFixed(6) || 'N/A'
        ].join(','));
      });
      
      const content = rows.join('\n');
      const blob = new Blob([content], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `best_models_${timestamp}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } else if (format === 'txt') {
      const headers = ['Compound', 'Model', 'IC50', 'RMSE', 'AIC'];
      const rows = [headers.join('\t')];
      
      this.dataSource.forEach(row => {
        rows.push([
          row.compound,
          row.model,
          row.ic50?.toFixed(6) || 'N/A',
          row.rmse?.toFixed(6) || 'N/A',
          row.aic?.toFixed(6) || 'N/A'
        ].join('\t'));
      });
      
      const content = rows.join('\n');
      const blob = new Blob([content], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `best_models_${timestamp}.txt`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  }
  
  exportAllModels(format: string = 'csv'): void {
    const results = this.doseResponseService.analysisResults();
    if (!results || !results.summaryTable) return;
    
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    const summaryData = results.summaryTable.toArray();
    
    if (format === 'csv') {
      const headers = ['Compound', 'Model', 'IC50', 'RMSE', 'AIC'];
      const rows = [headers.join(',')];
      
      summaryData.forEach((row: any) => {
        rows.push([
          `"${row.Compound}"`,
          `"${row.Model}"`,
          row.IC50?.toFixed(6) || 'N/A',
          row.RMSE?.toFixed(6) || 'N/A',
          row.AIC?.toFixed(6) || 'N/A'
        ].join(','));
      });
      
      const content = rows.join('\n');
      const blob = new Blob([content], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dose_response_summary_${timestamp}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } else if (format === 'txt') {
      const headers = ['Compound', 'Model', 'IC50', 'RMSE', 'AIC'];
      const rows = [headers.join('\t')];
      
      summaryData.forEach((row: any) => {
        rows.push([
          row.Compound,
          row.Model,
          row.IC50?.toFixed(6) || 'N/A',
          row.RMSE?.toFixed(6) || 'N/A',
          row.AIC?.toFixed(6) || 'N/A'
        ].join('\t'));
      });
      
      const content = rows.join('\n');
      const blob = new Blob([content], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dose_response_summary_${timestamp}.txt`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  }
}
