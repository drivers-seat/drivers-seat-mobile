import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { HourlyPayAnalyticsTrendComponent } from './hourly-pay-analytics-trend.component';

describe('HourlyPayAnalyticsTrendComponent', () => {
  let component: HourlyPayAnalyticsTrendComponent;
  let fixture: ComponentFixture<HourlyPayAnalyticsTrendComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ HourlyPayAnalyticsTrendComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(HourlyPayAnalyticsTrendComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
