import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { HourlyPayAnalyticsFooterMakeBetterComponent } from './hourly-pay-analytics-footer-make-better.component';

describe('HourlyPayAnalyticsFooterMakeBetterComponent', () => {
  let component: HourlyPayAnalyticsFooterMakeBetterComponent;
  let fixture: ComponentFixture<HourlyPayAnalyticsFooterMakeBetterComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ HourlyPayAnalyticsFooterMakeBetterComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(HourlyPayAnalyticsFooterMakeBetterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
