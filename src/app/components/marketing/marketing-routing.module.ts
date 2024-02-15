import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { CallToActionComponent } from './call-to-action/call-to-action.component';
import { GenerateReferralComponent } from './generate-referral/generate-referral.component';
import { SurveyComponent } from './survey/survey/survey.component';
import { CampaignListComponent } from './campaign-list/campaign-list.component';
import { CustomPageComponent } from './custom-page/custom-page.component';

const routes: Routes = [
  {
    path: '',
    component: CallToActionComponent
  },
  {
    path: 'cta/:id',
    component: CallToActionComponent
  },
  {
    path: 'referral/generate/:type',
    component: GenerateReferralComponent
  },
  {
    path: 'survey/:id',
    component: SurveyComponent
  },
  {
    path: 'campaigns/list',
    component: CampaignListComponent
  },
  {
    path: 'custom/:prefTypeCode',
    component: CustomPageComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MarketingRoutingModule { }
