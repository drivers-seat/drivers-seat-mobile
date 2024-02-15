import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { HourlyPayAnalyticsMetroNotEnoughDataComponent } from './hourly-pay-analytics-metro-not-enough-data.component';

describe('HourlyPayAnalyticsMetroNotEnoughDataComponent', () => {
  let component: HourlyPayAnalyticsMetroNotEnoughDataComponent;
  let fixture: ComponentFixture<HourlyPayAnalyticsMetroNotEnoughDataComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ HourlyPayAnalyticsMetroNotEnoughDataComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(HourlyPayAnalyticsMetroNotEnoughDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
