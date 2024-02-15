import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { HourlyPayAnalyticsHeatmapComponent } from './hourly-pay-analytics-heatmap.component';

describe('HourlyPayAnalyticsHeatmapComponent', () => {
  let component: HourlyPayAnalyticsHeatmapComponent;
  let fixture: ComponentFixture<HourlyPayAnalyticsHeatmapComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ HourlyPayAnalyticsHeatmapComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(HourlyPayAnalyticsHeatmapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
