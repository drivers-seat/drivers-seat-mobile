import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { StatsHourlyTrendPopupComponent } from './stats-hourly-trend-popup.component';

describe('StatsHourlyTrendPopupComponent', () => {
  let component: StatsHourlyTrendPopupComponent;
  let fixture: ComponentFixture<StatsHourlyTrendPopupComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ StatsHourlyTrendPopupComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(StatsHourlyTrendPopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
