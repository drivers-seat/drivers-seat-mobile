import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { ShiftTrackingToggleComponent } from './shift-tracking-toggle.component';

describe('ShiftTrackingToggleComponent', () => {
  let component: ShiftTrackingToggleComponent;
  let fixture: ComponentFixture<ShiftTrackingToggleComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ ShiftTrackingToggleComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(ShiftTrackingToggleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
