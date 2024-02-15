import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TimeHelper } from 'src/app/helpers/TimeHelper';
import { ReferralType } from 'src/app/models/ReferralType';
import { dayOfWeek } from 'src/app/models/UserPreferences';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import { IMissingValue } from '../hourly-pay-analytics-heatmap/hourly-pay-analytics-heatmap.component';
import { IOptionsDisplayValues } from '../hourly-pay-analytics/hourly-pay-analytics.component';
import { IBrowserNavigationService } from 'src/app/services/browser-navigation/browser-navigation.service';
import { IModalService } from 'src/app/services/modal/modal.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-hourly-pay-analytics-missing-data',
  templateUrl: './hourly-pay-analytics-missing-data.component.html',
  styleUrls: [
    '../hourly-pay-analytics.scss',
    './hourly-pay-analytics-missing-data.component.scss'],
})
export class HourlyPayAnalyticsMissingDataComponent implements OnInit {

  private readonly _logger: Logger;

  public get appDisplayName(): string { return environment.appDisplayName; }

  public missing_value_info: IMissingValue;
  public options_display: IOptionsDisplayValues;
  public time_slot: string;

  constructor(
    logSvc: ILogService,
    private readonly _modalSvc: IModalService,
    private readonly _navSvc: IBrowserNavigationService,
    private readonly _router: Router
  ) {
    this._logger = logSvc.getLogger("HourlyPayAnalyticsMissingDataComponent")
  }

  ngOnInit() {
    this._logger.LogDebug("ngOnInit", this.missing_value_info, this.options_display);

    this.setTimeSlotName();
  }

  private setTimeSlotName(){
    let dayName = dayOfWeek[this.missing_value_info.day];
    dayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);
    const hourName = TimeHelper.getHourDisplayName(this.missing_value_info.hour);

    this.time_slot = `${dayName}s at ${hourName}`;
  }

  public async onCancel(){
    await this._modalSvc.dismiss();
  }

  public async onReferClick(){
    this._modalSvc.dismiss();
    await this._navSvc.requestNavigation(false, false, false, `marketing/referral/generate/${ReferralType.FromHourlyPayAnalytics}`);
  }

  public updateGigAccountsClick(){
    this._modalSvc.dismiss();
    this._router.navigateByUrl('gig-accounts');
  }
}
