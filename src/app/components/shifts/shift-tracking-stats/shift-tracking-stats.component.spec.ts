import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { ShiftTrackingStatsComponent } from './shift-tracking-stats.component';

describe('ShiftTrackingStatsComponent', () => {
  let component: ShiftTrackingStatsComponent;
  let fixture: ComponentFixture<ShiftTrackingStatsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ ShiftTrackingStatsComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(ShiftTrackingStatsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
