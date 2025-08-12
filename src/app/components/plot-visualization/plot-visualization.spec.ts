import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlotVisualization } from './plot-visualization';

describe('PlotVisualization', () => {
  let component: PlotVisualization;
  let fixture: ComponentFixture<PlotVisualization>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlotVisualization]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlotVisualization);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
