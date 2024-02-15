import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { StatsViewWorkDetailsComponent } from './stats-view-work-details.component';

describe('StatsViewWorkDetailsComponent', () => {
  let component: StatsViewWorkDetailsComponent;
  let fixture: ComponentFixture<StatsViewWorkDetailsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ StatsViewWorkDetailsComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(StatsViewWorkDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
