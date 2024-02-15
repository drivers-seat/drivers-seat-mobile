import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { CampaignPreviewCardComponent } from './campaign-preview-card.component';

describe('CampaignPreviewCardComponent', () => {
  let component: CampaignPreviewCardComponent;
  let fixture: ComponentFixture<CampaignPreviewCardComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ CampaignPreviewCardComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(CampaignPreviewCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
