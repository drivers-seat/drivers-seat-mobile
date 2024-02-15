import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { StatsWaitingForDataComponent } from './stats-waiting-for-data.component';

describe('StatsWaitingForDataComponent', () => {
  let component: StatsWaitingForDataComponent;
  let fixture: ComponentFixture<StatsWaitingForDataComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ StatsWaitingForDataComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(StatsWaitingForDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
