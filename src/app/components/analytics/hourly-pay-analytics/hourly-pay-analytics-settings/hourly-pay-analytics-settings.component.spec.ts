import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { HourlyPayAnalyticsSettingsComponent } from './hourly-pay-analytics-settings.component';

describe('HourlyPayAnalyticsSettingsComponent', () => {
  let component: HourlyPayAnalyticsSettingsComponent;
  let fixture: ComponentFixture<HourlyPayAnalyticsSettingsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ HourlyPayAnalyticsSettingsComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(HourlyPayAnalyticsSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
