import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { StatsViewWorkDetailsWorkdayComponent } from './stats-view-work-details-workday.component';

describe('StatsViewWorkDetailsWorkdayComponent', () => {
  let component: StatsViewWorkDetailsWorkdayComponent;
  let fixture: ComponentFixture<StatsViewWorkDetailsWorkdayComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ StatsViewWorkDetailsWorkdayComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(StatsViewWorkDetailsWorkdayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
