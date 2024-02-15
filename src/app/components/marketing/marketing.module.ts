import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MarketingRoutingModule } from './marketing-routing.module';
import { CallToActionComponent } from './call-to-action/call-to-action.component';
import { GenerateReferralComponent } from './generate-referral/generate-referral.component';
import { SurveyComponent } from './survey/survey/survey.component';
import { SurveyFieldComponent } from './survey/survey-field/survey-field.component';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { SurveyActionComponent } from './survey/survey-action/survey-action.component';
import { VideoPlayerComponent } from './video-player/video-player.component';
import { CampaignCardComponent } from './campaign-card/campaign-card.component';
import { ChecklistCardComponent } from './checklist-card/checklist-card.component';
import { CampaignCarouselComponent } from './campaign-carousel/campaign-carousel.component';
import { CampaignPreviewCardComponent } from './campaign-preview-card/campaign-preview-card.component';
import { CampaignListComponent } from './campaign-list/campaign-list.component';
import { ChartComponent } from './chart/chart.component';
import { CustomPageComponent } from './custom-page/custom-page.component';
import { Chart } from 'chart.js';

@NgModule({
  declarations: [
    CallToActionComponent,
    GenerateReferralComponent,
    SurveyComponent,
    SurveyFieldComponent,
    SurveyActionComponent,
    VideoPlayerComponent,
    CampaignCardComponent,
    ChecklistCardComponent,
    CampaignCarouselComponent,
    CampaignPreviewCardComponent,
    CampaignListComponent,
    CustomPageComponent,
    ChartComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MarketingRoutingModule
  ],
  exports: [
    CampaignCardComponent,
    ChecklistCardComponent,
    CampaignCarouselComponent,
    CampaignPreviewCardComponent,
    CampaignListComponent,
    CustomPageComponent,
    ChartComponent
  ]
})
export class MarketingModule { }
