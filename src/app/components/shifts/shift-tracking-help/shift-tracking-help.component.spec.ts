import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { ShiftTrackingHelpComponent } from './shift-tracking-help.component';

describe('ShiftTrackingHelpComponent', () => {
  let component: ShiftTrackingHelpComponent;
  let fixture: ComponentFixture<ShiftTrackingHelpComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ ShiftTrackingHelpComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(ShiftTrackingHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
