import { Component, OnInit, OnDestroy, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatOptionModule } from '@angular/material/core';
import { PlotlyModule } from 'angular-plotly.js';
import { PlotlyService } from 'angular-plotly.js';

import { DoseResponseService } from '../../services/dose-response.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-compound-plot',
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatSelectModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    MatOptionModule,
    PlotlyModule
  ],
  templateUrl: './compound-plot.html',
  styleUrl: './compound-plot.scss'
})
export class CompoundPlot implements OnInit, OnDestroy {
  private doseResponseService = inject(DoseResponseService);
  private plotlyService = inject(PlotlyService);
  private themeService = inject(ThemeService);
  
  plotDivId = 'compound-plot-div';
  private graphDiv: any = null;
  
  selectedCompound = signal<string>('');
  availableCompounds = signal<string[]>([]);
  plotData: any[] = [];
  plotLayout: any = {};
  plotRevision: number = 0;
  compoundMetrics: any = null;
  exportFormat: string = 'png';
  referenceLineData: any = null;
  
  plotOptions = {
    responsive: true,
    displayModeBar: true,
    modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d', 'autoScale2d'],
    displaylogo: false
  };
  
  ngOnInit(): void {
    this.updateAvailableCompounds();
    this.updatePlot();
    
    // Watch for changes in plot config, column mapping, and data
    effect(() => {
      const config = this.doseResponseService.plotConfig();
      const mapping = this.doseResponseService.columnMapping();
      const rawData = this.doseResponseService.rawData();
      const results = this.doseResponseService.analysisResults();
      
      // Update compounds when data changes
      if (rawData) {
        this.updateAvailableCompounds();
      }
      
      this.updatePlot();
    });
  }
  
  ngOnDestroy(): void {
    // No cleanup needed
  }
  
  private updateAvailableCompounds(): void {
    const compounds = this.doseResponseService.getCompounds();
    this.availableCompounds.set(compounds);
    
    // Auto-select first compound if none selected
    if (!this.selectedCompound() && compounds.length > 0) {
      this.selectedCompound.set(compounds[0]);
    }
  }
  
  onCompoundChange(compound: string): void {
    this.selectedCompound.set(compound);
    this.updatePlot();
  }
  
  private updatePlot(): void {
    const compound = this.selectedCompound();
    if (!compound) {
      this.plotData = [];
      this.plotLayout = {};
      this.compoundMetrics = null;
      return;
    }
    
    const rawData = this.doseResponseService.rawData();
    const mapping = this.doseResponseService.columnMapping();
    const results = this.doseResponseService.analysisResults();
    const config = this.doseResponseService.plotConfig();
    
    if (!rawData || !mapping.compound || mapping.compound === '') {
      this.plotData = [];
      this.plotLayout = {};
      this.compoundMetrics = null;
      return;
    }
    
    // Filter data for selected compound
    const compoundData = rawData.filter(row => row[mapping.compound] === compound);
    
    if (compoundData.length === 0) {
      this.plotData = [];
      this.plotLayout = {};
      this.compoundMetrics = null;
      return;
    }
    
    const traces: any[] = [];
    
    // Add data points
    const xData = compoundData
      .map(row => parseFloat(row[mapping.concentration]))
      .filter(val => !isNaN(val));
    const yData = compoundData
      .map(row => parseFloat(row[mapping.response]))
      .filter(val => !isNaN(val));
    
    traces.push({
      x: xData,
      y: yData,
      mode: 'markers',
      type: 'scatter',
      name: `${compound} (data)`,
      marker: {
        color: config.dataPointColor,
        size: config.dataPointSize,
        opacity: config.dataPointAlpha,
        symbol: this.getPlotlyMarkerSymbol(config.pointMarkerStyle)
      },
      showlegend: true
    });
    
    // Calculate x-axis range even without fitted curve (for consistent plot boundaries)
    const dataXMin = Math.min(...xData.filter(x => x > 0)); // Only positive values
    const dataXMax = Math.max(...xData.filter(x => x > 0));
    
    // Validate data ranges to prevent extreme values
    if (!isFinite(dataXMin) || !isFinite(dataXMax) || dataXMin <= 0 || dataXMax <= 0) {
      return;
    }
    
    // Match Streamlit: xlim_extended = [x_min / 10, x_max * 10]
    const plotXMin = Math.max(dataXMin / 10, 1e-6); // Prevent values too close to 0
    const plotXMax = Math.min(dataXMax * 10, 1e6);   // Prevent extremely large values
    
    // Add fitted curve if analysis results available
    if (results && results.bestFittedModels && results.bestFittedModels[compound]) {
      const compoundResult = results.bestFittedModels[compound];
      const bestModelsData = results.bestModels.toArray();
      const modelData = bestModelsData.find((model: any) => model.Compound === compound);
      
      try {
        const curve = this.doseResponseService.generateCurve(compoundResult, 200);
        
        traces.push({
          x: curve.concentration,
          y: curve.response,
          mode: 'lines',
          type: 'scatter',
          name: `${compound} (${modelData?.Model || 'fitted'})`,
          line: {
            color: config.lineColor,
            width: config.lineThickness,
            opacity: config.lineAlpha,
            dash: this.getPlotlyLineDash(config.lineStyle)
          },
          showlegend: true
        });
        
        // Update metrics
        this.compoundMetrics = {
          model: modelData?.Model || 'N/A',
          ic50: compoundResult.modelResult.ic50,
          rmse: modelData?.RMSE || compoundResult.modelResult.rmse,
          aic: modelData?.AIC
        };
        
        // Store reference line data for layout shapes and annotations
        const ic50Value = compoundResult.modelResult.ic50;
        // Calculate IC50 response like Streamlit: (top + bottom) / 2
        const modelParams = compoundResult.modelResult.fittedParams;
        // For most models, assume standard 4-parameter logistic structure
        // [hillslope, bottom, top, ic50] or similar
        const top = modelParams.length >= 3 ? modelParams[2] : 1.0;
        const bottom = modelParams.length >= 2 ? modelParams[1] : 0.0;
        const ic50Response = (top + bottom) / 2;
        
        // Calculate observed Dmax: mean response at maximum concentration (like Streamlit)
        const maxConcentration = Math.max(...xData);
        const maxConcResponses = compoundData
          .filter(row => parseFloat(row[mapping.concentration]) === maxConcentration)
          .map(row => parseFloat(row[mapping.response]))
          .filter(val => !isNaN(val));
        const observedDmax = maxConcResponses.reduce((sum, val) => sum + val, 0) / maxConcResponses.length;
        
        // Predicted Dmax: bottom parameter (representing 100% inhibition)
        const predictedDmax = bottom;
        
        // Store these values for use in layout configuration
        this.referenceLineData = {
          ic50Value,
          ic50Response,
          observedDmax,
          predictedDmax,
          plotXMin,
          plotXMax,
          showIc50Lines: config.showIc50Lines,
          showDmaxLines: config.showDmaxLines,
          config
        };
        
      } catch (error) {
        // Still show metrics even if curve generation fails
        this.compoundMetrics = {
          model: modelData?.Model || 'N/A',
          ic50: null,
          rmse: modelData?.RMSE,
          aic: modelData?.AIC
        };
      }
    } else {
      this.compoundMetrics = null;
    }
    
    // Set reference line data for plot boundaries even without analysis results
    if (!this.referenceLineData) {
      this.referenceLineData = {
        ic50Value: null,
        ic50Response: null,
        observedDmax: null,
        predictedDmax: null,
        plotXMin,
        plotXMax,
        showIc50Lines: config.showIc50Lines,
        showDmaxLines: config.showDmaxLines,
        config
      };
    }
    
    // Update layout using config values
    const styleColors = this.getPlotStyleColors(config.plotStyle);
    const isDarkMode = config.plotStyle === 'dark_background' || 
                      (config.plotStyle === 'classic' && this.themeService.isDark());
    const axisLineColor = isDarkMode ? '#666666' : '#333333';
    
    this.plotLayout = {
      title: {
        text: `Dose-Response Curve: ${compound}`,
        font: { size: config.titleSize || 16 }
      },
      xaxis: {
        title: { text: 'Log Concentration', font: { size: config.textSize || 12 } },
        type: 'log',
        range: this.referenceLineData ? [Math.log10(this.referenceLineData.plotXMin), Math.log10(this.referenceLineData.plotXMax)] : undefined,
        showgrid: config.gridEnabled,
        gridcolor: `rgba(128, 128, 128, ${config.gridAlpha || 0.3})`,
        showline: true,
        linecolor: axisLineColor,
        linewidth: 1,
        zeroline: false
      },
      yaxis: {
        title: { text: 'Response', font: { size: config.textSize || 12 } },
        range: [0, 1.1],
        showgrid: config.gridEnabled,
        gridcolor: `rgba(128, 128, 128, ${config.gridAlpha || 0.3})`,
        showline: true,
        linecolor: axisLineColor,
        linewidth: 1,
        zeroline: false
      },
      width: config.plotWidth,
      height: config.plotHeight,
      margin: { l: 60, r: 60, t: 80, b: 60 },
      ...styleColors,
      font: { ...styleColors.font, family: 'Roboto, sans-serif' },
      legend: this.getLegendConfig(config.legendPosition, config.plotStyle),
      shapes: this.generateShapes(),
      annotations: this.generateAnnotations()
    };
    
    this.plotData = traces;
    this.plotRevision++; // Force plot update
  }
  
  private getPlotlyMarkerSymbol(style: string): string {
    const symbolMap: { [key: string]: string } = {
      'circle': 'circle',
      'square': 'square',
      'diamond': 'diamond',
      'cross': 'cross',
      'x': 'x',
      'triangle-up': 'triangle-up',
      'triangle-down': 'triangle-down',
      'star': 'star'
    };
    return symbolMap[style] || 'circle';
  }
  
  private getPlotlyLineDash(style: string): string {
    const dashMap: { [key: string]: string } = {
      'solid': 'solid',
      'dash': 'dash',
      'dot': 'dot',
      'dashdot': 'dashdot',
      'longdash': 'longdash',
      'longdashdot': 'longdashdot'
    };
    return dashMap[style] || 'solid';
  }
  
  private getPlotStyleColors(plotStyle: string): any {
    const isDarkTheme = this.themeService.isDark();
    
    // If using plot style 'dark_background' or if UI is in dark mode, use dark colors
    const useDarkStyle = plotStyle === 'dark_background' || (plotStyle === 'classic' && isDarkTheme);
    
    const lightStyleMap: { [key: string]: any } = {
      'seaborn-v0_8': {
        plot_bgcolor: '#f8f9fa',
        paper_bgcolor: 'white',
        font: { color: '#2e3440' }
      },
      'ggplot': {
        plot_bgcolor: '#e8e8e8',
        paper_bgcolor: 'white',
        font: { color: '#333333' }
      },
      'bmh': {
        plot_bgcolor: '#f5f5f5',
        paper_bgcolor: 'white',
        font: { color: '#262626' }
      },
      'classic': {
        plot_bgcolor: 'white',
        paper_bgcolor: 'white',
        font: { color: 'black' }
      },
      'fivethirtyeight': {
        plot_bgcolor: '#f0f0f0',
        paper_bgcolor: '#fafafa',
        font: { color: '#444444' }
      },
      'grayscale': {
        plot_bgcolor: '#f8f8f8',
        paper_bgcolor: '#ffffff',
        font: { color: '#2f2f2f' }
      }
    };
    
    const darkStyleMap: { [key: string]: any } = {
      'seaborn-v0_8': {
        plot_bgcolor: '#2a2d3a',
        paper_bgcolor: '#1e1e1e',
        font: { color: '#e8e8e8' }
      },
      'ggplot': {
        plot_bgcolor: '#3a3a3a',
        paper_bgcolor: '#2d2d2d',
        font: { color: '#e0e0e0' }
      },
      'bmh': {
        plot_bgcolor: '#2c2c2c',
        paper_bgcolor: '#1f1f1f',
        font: { color: '#e0e0e0' }
      },
      'classic': {
        plot_bgcolor: '#2d2d2d',
        paper_bgcolor: '#1f1f1f',
        font: { color: '#e0e0e0' }
      },
      'fivethirtyeight': {
        plot_bgcolor: '#2a2a2a',
        paper_bgcolor: '#1e1e1e',
        font: { color: '#c0c0c0' }
      },
      'grayscale': {
        plot_bgcolor: '#2f2f2f',
        paper_bgcolor: '#1a1a1a',
        font: { color: '#d0d0d0' }
      }
    };
    
    // Special case for dark_background style - always use dark colors
    if (plotStyle === 'dark_background') {
      return {
        plot_bgcolor: '#2f3136',
        paper_bgcolor: '#36393f',
        font: { color: '#dcddde' }
      };
    }
    
    const styleMap = useDarkStyle ? darkStyleMap : lightStyleMap;
    return styleMap[plotStyle] || styleMap['classic'];
  }
  
  private getLegendConfig(legendPosition: string, plotStyle: string = 'classic'): any {
    const positionMap: { [key: string]: any } = {
      'upper right': {
        orientation: 'v',
        x: 1,
        y: 1,
        xanchor: 'right',
        yanchor: 'top'
      },
      'upper left': {
        orientation: 'v',
        x: 0,
        y: 1,
        xanchor: 'left',
        yanchor: 'top'
      },
      'lower right': {
        orientation: 'v',
        x: 1,
        y: 0,
        xanchor: 'right',
        yanchor: 'bottom'
      },
      'lower left': {
        orientation: 'v',
        x: 0,
        y: 0,
        xanchor: 'left',
        yanchor: 'bottom'
      },
      'upper center': {
        orientation: 'h',
        x: 0.5,
        y: 1.02,
        xanchor: 'center',
        yanchor: 'bottom'
      },
      'lower center': {
        orientation: 'h',
        x: 0.5,
        y: -0.1,
        xanchor: 'center',
        yanchor: 'top'
      },
      'center': {
        orientation: 'v',
        x: 0.5,
        y: 0.5,
        xanchor: 'center',
        yanchor: 'middle'
      }
    };
    
    const isDarkTheme = plotStyle === 'dark_background' || 
                      (plotStyle === 'classic' && this.themeService.isDark());
    const baseConfig = {
      bgcolor: isDarkTheme ? 'rgba(45, 45, 45, 0.95)' : 'rgba(255, 255, 255, 0.9)',
      bordercolor: isDarkTheme ? '#666666' : '#cccccc',
      borderwidth: 1,
      font: { 
        size: 12,
        color: isDarkTheme ? '#e0e0e0' : '#333333'
      }
    };
    
    return {
      ...baseConfig,
      ...(positionMap[legendPosition] || positionMap['upper right'])
    };
  }
  
  private generateShapes(): any[] {
    const shapes: any[] = [];
    
    if (!this.referenceLineData) return shapes;
    
    const { ic50Value, ic50Response, observedDmax, predictedDmax, plotXMin, plotXMax, 
            showIc50Lines, showDmaxLines, config } = this.referenceLineData;
    
    // IC50 reference lines as shapes
    if (showIc50Lines && ic50Value && !isNaN(ic50Value) && !isNaN(ic50Response)) {
      // Vertical line at IC50 concentration (full height)
      shapes.push({
        type: 'line',
        xref: 'x',
        yref: 'paper',
        x0: ic50Value,
        y0: 0,
        x1: ic50Value,
        y1: 1,
        line: {
          color: config.ic50VerticalLineColor,
          width: 2,
          dash: 'dash'
        }
      });
      
      // Horizontal line at IC50 response level (across plot x-axis range)
      shapes.push({
        type: 'line',
        xref: 'x',
        yref: 'y',
        x0: plotXMin,
        y0: ic50Response,
        x1: plotXMax,
        y1: ic50Response,
        line: {
          color: config.ic50HorizontalLineColor,
          width: 2,
          dash: 'dash'
        }
      });
    }
    
    // Dmax reference lines as shapes
    if (showDmaxLines) {
      // Observed Dmax line (across plot x-axis range)
      shapes.push({
        type: 'line',
        xref: 'x',
        yref: 'y',
        x0: plotXMin,
        y0: observedDmax,
        x1: plotXMax,
        y1: observedDmax,
        line: {
          color: config.observedDmaxColor,
          width: 2,
          dash: 'dash'
        }
      });
      
      // Predicted Dmax line (only if significantly different from observed, like Streamlit)
      const bottomThreshold = 0.02;
      if (Math.abs(observedDmax - predictedDmax) > bottomThreshold && 
          predictedDmax <= observedDmax) {
        shapes.push({
          type: 'line',
          xref: 'x',
          yref: 'y',
          x0: plotXMin,
          y0: predictedDmax,
          x1: plotXMax,
          y1: predictedDmax,
          line: {
            color: config.predictedDmaxColor,
            width: 2,
            dash: 'dash'
          }
        });
      }
    }
    
    return shapes;
  }
  
  private generateAnnotations(): any[] {
    const annotations: any[] = [];
    
    if (!this.referenceLineData) return annotations;
    
    const { ic50Value, ic50Response, observedDmax, predictedDmax, plotXMin, plotXMax, 
            showIc50Lines, showDmaxLines, config } = this.referenceLineData;
    
    // IC50 annotations (following Streamlit pattern)
    if (showIc50Lines && ic50Value && !isNaN(ic50Value) && !isNaN(ic50Response)) {
      // IC50 value annotation - positioned like Streamlit (ic50 * 1.1, top of plot)
      annotations.push({
        x: ic50Value * 1.1,
        y: 0.95, // Top of plot like Streamlit
        xref: 'x',
        yref: 'paper', // Use paper coordinates for consistent positioning
        text: `IC₅₀ = ${ic50Value.toFixed(1)}`,
        showarrow: false,
        font: {
          color: config.lineColor || '#ff7f0e', // Use line color like Streamlit
          size: config.textSize || 12,
          weight: 'bold'
        },
        bgcolor: 'rgba(255, 255, 255, 0.9)',
        bordercolor: config.lineColor || '#ff7f0e',
        borderwidth: 1,
        borderpad: 3
      });
      
      // IC50 horizontal line explanation - positioned like Streamlit (left side, at line level)
      annotations.push({
        x: plotXMin,
        y: ic50Response - 0.05,
        xref: 'x',
        yref: 'y',
        text: '50% of maximum inhibition',
        showarrow: false,
        font: {
          color: config.ic50HorizontalLineColor,
          size: (config.textSize || 12) - 3 // Smaller text like Streamlit
        },
        bgcolor: 'rgba(255, 255, 255, 0.8)',
        borderwidth: 0
      });
    }
    
    return annotations;
  }

  onPlotInitialized(event: any): void {
    this.graphDiv = event;
  }

  async exportPlot(format: string = 'png'): Promise<void> {
    if (this.plotData.length === 0 || !this.graphDiv) return;
    
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    const filename = `${this.selectedCompound()}_plot_${timestamp}`;
    
    const plot = await this.plotlyService.getPlotly();
    await plot.downloadImage(this.graphDiv, {
      format: format,
      filename: filename,
      width: this.plotLayout.width || 800,
      height: this.plotLayout.height || 600
    });
  }
}
