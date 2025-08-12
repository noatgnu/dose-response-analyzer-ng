import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DoseResponseAnalyzer, AnalysisResults } from 'dose-analyzer-response';
import { DataFrame, fromCSV } from 'data-forge';

export interface DataFile {
  name: string;
  content: string;
  data?: any[];
}

export interface ColumnMapping {
  compound: string;
  concentration: string;
  response: string;
}

export interface PlotConfig {
  plotWidth: number;
  plotHeight: number;
  dataPointSize: number;
  dataPointAlpha: number;
  dataPointColor: string;
  lineThickness: number;
  lineAlpha: number;
  lineColor: string;
  showIc50Lines: boolean;
  showDmaxLines: boolean;
  gridEnabled: boolean;
  // Reference line colors
  ic50VerticalLineColor: string;
  ic50HorizontalLineColor: string;
  observedDmaxColor: string;
  predictedDmaxColor: string;
  // Advanced styling
  plotStyle: string;
  pointMarkerStyle: string;
  lineStyle: string;
  legendPosition: string;
  // Text and grid styling
  textSize?: number;
  titleSize?: number;
  gridAlpha?: number;
  gridStyle?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DoseResponseService {
  private analyzer: DoseResponseAnalyzer;
  private http = inject(HttpClient);
  
  // Data signals
  public rawData = signal<any[] | null>(null);
  public dataFrame = signal<DataFrame | null>(null);
  public analysisResults = signal<AnalysisResults | null>(null);
  public isAnalyzing = signal(false);
  public errorMessage = signal<string | null>(null);
  
  // Configuration signals
  public columnMapping = signal<ColumnMapping>({
    compound: '',
    concentration: '',
    response: ''
  });
  
  public plotConfig = signal<PlotConfig>({
    plotWidth: 800,
    plotHeight: 600,
    dataPointSize: 8,
    dataPointAlpha: 0.8,
    dataPointColor: '#1f77b4',
    lineThickness: 2,
    lineAlpha: 0.9,
    lineColor: '#ff7f0e',
    showIc50Lines: true,
    showDmaxLines: true,
    gridEnabled: true,
    // Reference line colors
    ic50VerticalLineColor: '#d62728',
    ic50HorizontalLineColor: '#d62728',
    observedDmaxColor: '#2ca02c',
    predictedDmaxColor: '#ff7f0e',
    // Advanced styling
    plotStyle: 'seaborn-v0_8',
    pointMarkerStyle: 'circle',
    lineStyle: 'solid',
    legendPosition: 'upper right',
    // Text and grid styling
    textSize: 12,
    titleSize: 16,
    gridAlpha: 0.3,
    gridStyle: 'solid'
  });
  
  // Sample data files
  public sampleFiles = signal<string[]>(['mp-1-008.csv']);
  
  constructor() {
    // Initialize analyzer with basic config
    this.analyzer = new DoseResponseAnalyzer({
      enableCustomModels: false,
      maxIterations: 10000,
      tolerance: 1e-8
    });
  }
  
  /**
   * Parse CSV content using data-forge
   */
  parseCSV(content: string): any[] {
    const df = fromCSV(content);
    return df.toArray();
  }
  
  /**
   * Load and process a data file
   */
  async loadData(file: File | string): Promise<void> {
    try {
      this.errorMessage.set(null);
      let content: string;
      
      if (typeof file === 'string') {
        content = await this.loadSampleFile(file);
      } else {
        content = await this.readFile(file);
      }
      
      const data = this.parseCSV(content);
      
      this.rawData.set(data);
      const df = new DataFrame(data);
      this.dataFrame.set(df);
      
      // Auto-detect column mapping
      this.autoDetectColumns(data);
      
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Error loading data');
    }
  }
  
  /**
   * Read file content as text
   */
  private readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }
  
  /**
   * Load sample file from assets
   */
  private async loadSampleFile(fileName: string): Promise<string> {
    try {
      const response = await this.http.get(`/assets/${fileName}`, { responseType: 'text' }).toPromise();
      if (!response) {
        throw new Error(`Failed to load sample file: ${fileName}`);
      }
      return response;
    } catch (error) {
      // Fallback sample data
      return `Compound,Conc,Rab10,Rep
MP-1-008,0,1.00,1
MP-1-008,0.1,0.95,1
MP-1-008,0.3,0.92,1
MP-1-008,1.0,0.85,1
MP-1-008,3.0,0.78,1
MP-1-008,10.0,0.65,1
MP-1-008,30.0,0.45,1
MP-1-008,100.0,0.25,1`;
    }
  }
  
  /**
   * Auto-detect column mapping from data
   */
  private autoDetectColumns(data: any[]): void {
    if (!data || data.length === 0) return;
    
    const columns = Object.keys(data[0]);
    
    let mapping: ColumnMapping = {
      compound: columns[0],
      concentration: columns[0],
      response: columns[0]
    };
    
    // Look for exact matches first
    for (const col of columns) {
      if (col.toLowerCase().includes('compound') || col.toLowerCase().includes('drug')) {
        mapping.compound = col;
      }
      if (col.toLowerCase().includes('conc') || col.toLowerCase().includes('dose')) {
        mapping.concentration = col;
      }
      if (col.toLowerCase().includes('response') || col.toLowerCase().includes('rab') || col.toLowerCase().includes('signal')) {
        mapping.response = col;
      }
    }
    
    this.columnMapping.set(mapping);
  }
  
  /**
   * Run dose-response analysis
   */
  async runAnalysis(): Promise<void> {
    const data = this.rawData();
    const mapping = this.columnMapping();
    
    if (!data || data.length === 0) {
      this.errorMessage.set('No data loaded');
      return;
    }
    
    try {
      this.isAnalyzing.set(true);
      this.errorMessage.set(null);
      
      // Clean and filter data
      const cleanedData = this.cleanAndFilterData(data, mapping);
      
      if (cleanedData.length === 0) {
        throw new Error('No valid data rows after cleaning');
      }
      
      
      // Create analyzer with current column mapping
      this.analyzer = new DoseResponseAnalyzer({
        columnMapping: mapping,
        enableCustomModels: false,
        maxIterations: 10000,
        tolerance: 1e-8
      });
      
      // Create DataFrame and run analysis
      const df = new DataFrame(cleanedData);
      
      const results = this.analyzer.fitBestModels(df);
      
      // Set results asynchronously to prevent hanging
      setTimeout(() => {
        this.analysisResults.set(results);
      }, 0);
      
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Analysis failed');
    } finally {
      this.isAnalyzing.set(false);
    }
  }
  
  /**
   * Clean and filter data
   */
  private cleanAndFilterData(data: any[], mapping: ColumnMapping): any[] {
    return data
      .filter(row => {
        const hasCompound = row[mapping.compound];
        const concValue = parseFloat(row[mapping.concentration]);
        const respValue = parseFloat(row[mapping.response]);
        
        return hasCompound && !isNaN(concValue) && !isNaN(respValue) && concValue > 0;
      })
      .map(row => ({
        ...row,
        [mapping.concentration]: parseFloat(row[mapping.concentration]),
        [mapping.response]: parseFloat(row[mapping.response]),
        [mapping.compound]: String(row[mapping.compound]).trim()
      }));
  }
  
  /**
   * Get available compounds
   */
  getCompounds(): string[] {
    const data = this.rawData();
    const mapping = this.columnMapping();
    
    if (!data || data.length === 0) return [];
    
    return [...new Set(data.map(row => row[mapping.compound]).filter(c => c))];
  }
  
  /**
   * Get data summary
   */
  getDataSummary() {
    const data = this.rawData();
    const mapping = this.columnMapping();
    
    if (!data || data.length === 0) {
      return {
        totalRows: 0,
        compounds: [],
        concentrationRange: [0, 0],
        responseRange: [0, 0]
      };
    }
    
    const compounds = this.getCompounds();
    
    const concentrations = data
      .map(row => parseFloat(row[mapping.concentration]))
      .filter(val => !isNaN(val));
    
    const responses = data
      .map(row => parseFloat(row[mapping.response]))
      .filter(val => !isNaN(val));
    
    return {
      totalRows: data.length,
      compounds,
      concentrationRange: concentrations.length > 0 ? 
        [Math.min(...concentrations), Math.max(...concentrations)] : [0, 0],
      responseRange: responses.length > 0 ?
        [Math.min(...responses), Math.max(...responses)] : [0, 0]
    };
  }
  
  /**
   * Generate curve prediction for plotting
   */
  generateCurve(compoundResult: any, nPoints: number = 200): any {
    return this.analyzer.predictCurve(compoundResult, undefined, nPoints);
  }
  
  /**
   * Update column mapping
   */
  updateColumnMapping(mapping: ColumnMapping): void {
    this.columnMapping.set(mapping);
  }
  
  /**
   * Update plot configuration
   */
  updatePlotConfig(config: Partial<PlotConfig>): void {
    console.log('Service updating plot config:', config);
    const oldConfig = this.plotConfig();
    this.plotConfig.set({ ...oldConfig, ...config });
    console.log('New plot config:', this.plotConfig());
  }
  
  /**
   * Get available columns from data
   */
  getAvailableColumns(): string[] {
    const data = this.rawData();
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]);
  }
  
  /**
   * Get analysis progress (for future use)
   */
  analysisProgress = signal<{ step: string; progress: number } | null>(null);
  
  /**
   * Reset all data
   */
  reset(): void {
    this.rawData.set(null);
    this.dataFrame.set(null);
    this.analysisResults.set(null);
    this.errorMessage.set(null);
    this.isAnalyzing.set(false);
    this.analysisProgress.set(null);
  }
}