import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { StatsViewWorkDetailsSummaryComponent } from './stats-view-work-details-summary.component';

describe('StatsViewWorkDetailsSummaryComponent', () => {
  let component: StatsViewWorkDetailsSummaryComponent;
  let fixture: ComponentFixture<StatsViewWorkDetailsSummaryComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ StatsViewWorkDetailsSummaryComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(StatsViewWorkDetailsSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
