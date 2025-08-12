import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ],
  template: `
    <button 
      mat-icon-button 
      (click)="toggleTheme()"
      [matTooltip]="themeService.isDark() ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
      class="theme-toggle-button">
      <mat-icon>
        {{ themeService.isDark() ? 'light_mode' : 'dark_mode' }}
      </mat-icon>
    </button>
  `,
  styles: [`
    .theme-toggle-button {
      transition: transform 0.2s ease;
    }
    
    .theme-toggle-button:hover {
      transform: scale(1.1);
    }
  `]
})
export class ThemeToggle {
  public themeService = inject(ThemeService);
  
  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}