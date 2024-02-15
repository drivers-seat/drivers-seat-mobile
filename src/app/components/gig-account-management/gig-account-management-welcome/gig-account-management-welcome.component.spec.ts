import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { GigAccountManagementWelcomeComponent } from './gig-account-management-welcome.component';

describe('GigAccountManagementWelcomeComponent', () => {
  let component: GigAccountManagementWelcomeComponent;
  let fixture: ComponentFixture<GigAccountManagementWelcomeComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ GigAccountManagementWelcomeComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(GigAccountManagementWelcomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
