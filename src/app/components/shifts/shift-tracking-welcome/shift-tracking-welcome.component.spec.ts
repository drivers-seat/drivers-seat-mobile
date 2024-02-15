import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { ShiftTrackingWelcomeComponent } from './shift-tracking-welcome.component';

describe('ShiftTrackingWelcomeComponent', () => {
  let component: ShiftTrackingWelcomeComponent;
  let fixture: ComponentFixture<ShiftTrackingWelcomeComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ ShiftTrackingWelcomeComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(ShiftTrackingWelcomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
