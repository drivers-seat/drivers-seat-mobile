import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { HourlyPayAnalyticsMissingDataComponent } from './hourly-pay-analytics-missing-data.component';

describe('HourlyPayAnalyticsMissingDataComponent', () => {
  let component: HourlyPayAnalyticsMissingDataComponent;
  let fixture: ComponentFixture<HourlyPayAnalyticsMissingDataComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ HourlyPayAnalyticsMissingDataComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(HourlyPayAnalyticsMissingDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
