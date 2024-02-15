import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { PublicTermsOfServiceComponent } from './public-terms-of-service.component';

describe('PublicTermsOfServiceComponent', () => {
  let component: PublicTermsOfServiceComponent;
  let fixture: ComponentFixture<PublicTermsOfServiceComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ PublicTermsOfServiceComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(PublicTermsOfServiceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
