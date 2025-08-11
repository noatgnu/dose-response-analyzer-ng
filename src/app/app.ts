import { Component, signal} from '@angular/core';
import {Router, RouterOutlet} from '@angular/router';
import { DoseResponseAnalyzerComponent } from './components/dose-response-analyzer/dose-response-analyzer';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, DoseResponseAnalyzerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('dose-response-analyzer-ng');

}
