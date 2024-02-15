import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { CampaignCarouselComponent } from './campaign-carousel.component';

describe('CampaignCarouselComponent', () => {
  let component: CampaignCarouselComponent;
  let fixture: ComponentFixture<CampaignCarouselComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ CampaignCarouselComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(CampaignCarouselComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
