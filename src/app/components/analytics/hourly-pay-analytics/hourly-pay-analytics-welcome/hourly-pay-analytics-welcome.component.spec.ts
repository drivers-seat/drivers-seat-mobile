import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { HourlyPayAnalyticsWelcomeComponent } from './hourly-pay-analytics-welcome.component';

describe('HourlyPayAnalyticsWelcomeComponent', () => {
  let component: HourlyPayAnalyticsWelcomeComponent;
  let fixture: ComponentFixture<HourlyPayAnalyticsWelcomeComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ HourlyPayAnalyticsWelcomeComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(HourlyPayAnalyticsWelcomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
