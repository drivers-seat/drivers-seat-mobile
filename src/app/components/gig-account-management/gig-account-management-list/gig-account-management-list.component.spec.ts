import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { GigAccountManagementListComponent } from './gig-account-management-list.component';

describe('GigAccountManagementListComponent', () => {
  let component: GigAccountManagementListComponent;
  let fixture: ComponentFixture<GigAccountManagementListComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ GigAccountManagementListComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(GigAccountManagementListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
