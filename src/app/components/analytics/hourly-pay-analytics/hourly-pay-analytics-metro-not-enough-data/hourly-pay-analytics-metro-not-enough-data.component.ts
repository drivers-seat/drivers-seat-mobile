import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ReferralType } from 'src/app/models/ReferralType';
import { IBrowserNavigationService } from 'src/app/services/browser-navigation/browser-navigation.service';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'hourly-pay-analytics-metro-not-enough-data',
  templateUrl: './hourly-pay-analytics-metro-not-enough-data.component.html',
  styleUrls: [
    '../hourly-pay-analytics.scss',
    './hourly-pay-analytics-metro-not-enough-data.component.scss'],
})
export class HourlyPayAnalyticsMetroNotEnoughDataComponent implements OnInit {

  private readonly _logger: Logger;
  
  public get appDisplayName(): string { return environment.appDisplayName; }
  
  constructor(
    logSvc: ILogService,
    private readonly _navSvc: IBrowserNavigationService,
    private readonly _router: Router
  ) { 

    this._logger = logSvc.getLogger("HourlyPayAnalyticsMetroNotEnoughDataComponent");
  }

  ngOnInit() {}

  public async onReferClick(){
    await this._navSvc.requestNavigation(false, false, false, `marketing/referral/generate/${ReferralType.FromHourlyPayAnalytics}`);
  }

  public updateGigAccountsClick(){
    this._router.navigateByUrl('gig-accounts');
  }
}
