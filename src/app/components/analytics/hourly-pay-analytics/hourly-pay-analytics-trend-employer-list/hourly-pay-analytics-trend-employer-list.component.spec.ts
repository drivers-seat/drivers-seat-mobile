import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { HourlyPayAnalyticsTrendEmployerListComponent } from './hourly-pay-analytics-trend-employer-list.component';

describe('HourlyPayAnalyticsTrendEmployerListComponent', () => {
  let component: HourlyPayAnalyticsTrendEmployerListComponent;
  let fixture: ComponentFixture<HourlyPayAnalyticsTrendEmployerListComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ HourlyPayAnalyticsTrendEmployerListComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(HourlyPayAnalyticsTrendEmployerListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
