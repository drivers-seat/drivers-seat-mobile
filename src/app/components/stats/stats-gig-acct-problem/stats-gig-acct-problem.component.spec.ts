import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { StatsGigAcctProblemComponent } from './stats-gig-acct-problem.component';

describe('StatsGigAcctProblemComponent', () => {
  let component: StatsGigAcctProblemComponent;
  let fixture: ComponentFixture<StatsGigAcctProblemComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ StatsGigAcctProblemComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(StatsGigAcctProblemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
