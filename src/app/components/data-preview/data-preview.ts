import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { DoseResponseService } from '../../services/dose-response.service';

@Component({
  selector: 'app-data-preview',
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatChipsModule
  ],
  templateUrl: './data-preview.html',
  styleUrl: './data-preview.scss'
})
export class DataPreviewComponent {
  rawData = computed(() => this.doseResponseService.rawData());
  columnMapping = computed(() => this.doseResponseService.columnMapping());
  
  displayedColumns = computed(() => {
    const data = this.rawData();
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]);
  });

  previewData = computed(() => {
    const data = this.rawData();
    if (!data || data.length === 0) return [];
    return data.slice(0, 10); // Show first 10 rows
  });

  dataSummary = computed(() => {
    const data = this.rawData();
    if (!data || data.length === 0) return null;
    
    return {
      totalRows: data.length,
      totalColumns: Object.keys(data[0]).length,
      columnNames: Object.keys(data[0])
    };
  });

  constructor(private doseResponseService: DoseResponseService) {}
}