import { Component, OnInit } from '@angular/core';
import { ReferralType } from 'src/app/models/ReferralType';
import { IBrowserNavigationService } from 'src/app/services/browser-navigation/browser-navigation.service';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import { IModalService } from 'src/app/services/modal/modal.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'hourly-pay-analytics-footer-make-better',
  templateUrl: './hourly-pay-analytics-footer-make-better.component.html',
  styleUrls: [
    '../hourly-pay-analytics.scss',
    './hourly-pay-analytics-footer-make-better.component.scss'],
})
export class HourlyPayAnalyticsFooterMakeBetterComponent implements OnInit {

  public isExpanded:boolean;

  private _logger:Logger;

  public get appDisplayName(): string { return environment.appDisplayName; }

  constructor(
    logSvc: ILogService,
    private readonly _navSvc: IBrowserNavigationService,
    private readonly _modalSvc: IModalService
  ) { 
    this._logger = logSvc.getLogger("HourlyPayAnalyticsFooterMakeBetterComponent");
  }

  ngOnInit() {}

  public toggleExpand(){
    this.isExpanded = !this.isExpanded;
  }

  public async clickRefer(){
    await this._navSvc.requestNavigation(false, false, false, `marketing/referral/generate/${ReferralType.FromHourlyPayAnalytics}`);
    await this._modalSvc.dismiss();
    this.toggleExpand();
  }

}
