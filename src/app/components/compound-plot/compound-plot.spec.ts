import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompoundPlot } from './compound-plot';

describe('CompoundPlot', () => {
  let component: CompoundPlot;
  let fixture: ComponentFixture<CompoundPlot>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompoundPlot]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CompoundPlot);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
