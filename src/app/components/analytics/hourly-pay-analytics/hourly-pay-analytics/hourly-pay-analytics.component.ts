import { Component, OnInit } from '@angular/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { TextHelper } from 'src/app/helpers/TextHelper';
import { AverageHourlyPaySummary, IPerformanceBin } from 'src/app/models/CommunityInsights';
import { Employer } from 'src/app/models/Employer';
import { HourlyPayAnalyticsOptions } from 'src/app/models/HourlyPayAnalyticsOptions';
import { KnowledgeBaseArticle } from 'src/app/models/KnowledgeBaseArticle';
import { MetroArea } from 'src/app/models/MetroArea';
import { PreferenceType } from 'src/app/models/PreferenceType';
import { IAnalyticsService } from 'src/app/services/analytics/analytics.service';
import { IDeviceService } from 'src/app/services/device/device.service';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import { ILookupDataService } from 'src/app/services/lookup-data/lookup-data.service';
import { IPreferenceService } from 'src/app/services/preferences/preferences.service';
import { IUserSupportService } from 'src/app/services/user-support/user-support.service';
import { IMissingValue } from '../hourly-pay-analytics-heatmap/hourly-pay-analytics-heatmap.component';
import { HourlyPayAnalyticsMissingDataComponent } from '../hourly-pay-analytics-missing-data/hourly-pay-analytics-missing-data.component';
import { HourlyPayAnalyticsSettingsComponent } from '../hourly-pay-analytics-settings/hourly-pay-analytics-settings.component';
import { HourlyPayAnalyticsTrendComponent } from '../hourly-pay-analytics-trend/hourly-pay-analytics-trend.component';
import { IModalService } from 'src/app/services/modal/modal.service';
import { TimeHelper } from 'src/app/helpers/TimeHelper';
import { UserTrackingService } from 'src/app/services/user-tracking/user-tracking.service';

export interface IOptionsDisplayValues {
  metro_area_name?: string,
  employer_filter?: string,
  calc_method?: string,
  mileage_method?: string
};

@Component({
  selector: 'hourly-pay-analytics',
  templateUrl: './hourly-pay-analytics.component.html',
  styleUrls: [
    '../hourly-pay-analytics.scss',
    './hourly-pay-analytics.component.scss'],
})
export class HourlyPayAnalyticsComponent implements OnInit {

  private readonly _logger: Logger;

  private _employerMap: { [key: number]: Employer };
  private _metroAreaMap: { [key: number]: MetroArea };
  private _options: HourlyPayAnalyticsOptions;
  private _performanceBins: Array<IPerformanceBin>;

  public optionsDisplay: IOptionsDisplayValues;
  public prefSvcIsReady: boolean = false;
  public performanceStats: Array<AverageHourlyPaySummary>;
  private _lookupDataIsReady: boolean;
  private _viewVisible: boolean;

  public optionsValid: boolean;
  public notEnoughData: boolean;

  constructor(
    logSvc: ILogService,
    private readonly _deviceSvc: IDeviceService,
    private readonly _modalSvc: IModalService,
    private readonly _preferenceSvc: IPreferenceService,
    private readonly _lookupDataSvc: ILookupDataService,
    private readonly _analyticsSvc: IAnalyticsService,
    private readonly _userSupportSvc: IUserSupportService,
    private readonly _userTrackingSvc: UserTrackingService
  ) {
    this._logger = logSvc.getLogger("HourlyPayAnalyticsComponent");

    this._lookupDataSvc.isReady$.subscribe(async ready => {
      if (!ready) {
        return;
      }

      this._employerMap = this._lookupDataSvc.employers_map;
      this._metroAreaMap = this._lookupDataSvc.metro_areas_map;
      this._lookupDataIsReady = true;

      await this.onOptionsChanged();
    });

    this._preferenceSvc.subscribe(PreferenceType.HourlyPayAnalytics, async options => {
      this._logger.LogDebug("PreferenceType.HourlyPayAnalytics changed", options);
      this._options = <HourlyPayAnalyticsOptions>options?.value;

      await this.onOptionsChanged();
    });

    this._preferenceSvc.isReady$.subscribe(ready => {
      this.prefSvcIsReady = ready;
    });
  }

  ngOnInit() {
  }

  public async ionViewWillEnter() {
    this._logger.LogDebug("ionViewWillEnter");
    this._viewVisible = true;
    await this.onOptionsChanged();
  }

  public async ionViewWillLeave() {
    this._logger.LogDebug("ionViewWillLeave");
    this._viewVisible = false;

    if (!this._deviceSvc.is_Web) {
      await StatusBar.setStyle({
        style: Style.Light
      });
    }
  }

  private async onOptionsChanged() {

    if (!this._lookupDataIsReady || !this._viewVisible) {
      return;
    }

    this._logger.LogDebug("onOptionsChanged", this._options);

    this._performanceBins = null;
    this.performanceStats = null;
    this.optionsDisplay = null;

    this._options = this._options || new HourlyPayAnalyticsOptions();

    this.optionsValid = HourlyPayAnalyticsOptions.isValid(this._options);

    await this.updateUI();

    if (!this.optionsValid) {
      await this._userTrackingSvc.setScreenName("home/insights/welcome");
      return;
    }

    this.setOptionsDisplayText();

    this.performanceStats = await this._analyticsSvc.getHourlyPayAnalyticsSummary(this._options);

    this.notEnoughData = this.performanceStats.length < 32

    this._performanceBins = this._analyticsSvc.setPerformanceBins(10, this._options, this.performanceStats);

    const coverage_percent = Math.round(((this.performanceStats?.length || 0)/168) * 100)/100;
    const event_data = {... this.optionsDisplay};
    event_data["coverage_percent"] = coverage_percent;
    const url = this.notEnoughData
      ? "home/insights/notEnoughData"
      : `home/insights/heatmap/${this._options?.display_value}`;

    await this._userTrackingSvc.setScreenName(url, event_data);
  }

  public async showHelpClick() {
    this._logger.LogDebug("openHelp");
    await this._userSupportSvc.openKnowledgeBaseArticle(KnowledgeBaseArticle.HourlyPayAnalytics);
  }

  public async showOptionsClick(source: string) {
    this._logger.LogDebug("openOptions");
    
    const modal = await this._modalSvc.open("home/insights/settings", {
      component: HourlyPayAnalyticsSettingsComponent,
      cssClass: 'pop-up-hourly-pay-analytics'
    },{
      source: source
    });
    
    const result = await modal.onDidDismiss<HourlyPayAnalyticsOptions>();

    //if the value is false, it means that the user cancelled.
    //Fire off the on options changed event to double-check if the user has enough information
    //filled out.
    if (!result.data) {
      this.onOptionsChanged();
    }
    this._logger.LogDebug("openOptions", "onDidDismiss", result);
  }

  public setOptionsDisplayText() {

    if (!this._options) {
      this.optionsDisplay = null;
      return;
    }

    const displayValues: IOptionsDisplayValues = {};

    //Employers and Service Classes
    const cmp = Array<string>();
    this._options.service_classes?.forEach(sc => cmp.push(`All ${sc}`));
    this._options.employer_ids?.forEach(empId => cmp.push(this._employerMap[empId].name));

    if (cmp.length > 0) {
      displayValues.employer_filter = TextHelper.toFriendlyCsv("and", cmp);
    }

    //Metro Area
    if (this._options.metro_area_id) {
      displayValues.metro_area_name = this._metroAreaMap[this._options.metro_area_id]?.name;
    }

    switch (this._options.display_value) {
      case 'avgHourlyPay':
        displayValues.calc_method = "Average Hourly Pay";
        break;
      case 'bestEmployerPay':
        displayValues.calc_method = "Best Platforms";
        break;
    }

    displayValues.mileage_method = this._options?.deduct_mileage
      ? "Deducting mileage expense"
      : "Not deducting mileage expense"

    this.optionsDisplay = displayValues;
  }

  public async onMetricClick(metric: AverageHourlyPaySummary) {

    this._logger.LogDebug("onMetricClick", metric, this._options);

    const eventData = {...this.optionsDisplay}
    eventData["day"] =  TimeHelper.dayNumberToNameMatrix[metric.day_of_week];
    eventData["hour"] = TimeHelper.getHourDisplayName(metric.hour_of_day);

    await this._modalSvc.open("home/insights/detail",{
      component: HourlyPayAnalyticsTrendComponent,
      cssClass: 'pop-up-hourly-pay-analytics',
      componentProps: {
        options: this._options,
        performance_bins: this._performanceBins,
        options_display: this.optionsDisplay,
        summary_stat: metric
      }
    }, eventData);
  }

  public async onMissingValueClick(missingValueInfo: IMissingValue) {

    this._logger.LogDebug("onMissingValue", missingValueInfo);

    const eventData = {...this.optionsDisplay}
    eventData["day"] =  TimeHelper.dayNumberToNameMatrix[missingValueInfo.day];
    eventData["hour"] = TimeHelper.getHourDisplayName(missingValueInfo.hour);

    await this._modalSvc.open("home/insights/missing",{
      component: HourlyPayAnalyticsMissingDataComponent,
      cssClass: 'pop-up-hourly-pay-analytics',
      componentProps: {
        options: this._options,
        missing_value_info: missingValueInfo,
        options_display: this.optionsDisplay,
      },
    }, eventData);
  }

  private async updateUI() {

    if (this._deviceSvc.is_Web) {
      return;
    }

    if (!this.optionsValid) {
      this._logger.LogDebug("updateUI", "setting to Dark", this.optionsValid);
      await StatusBar.setStyle({
        style: Style.Dark
      });
      return;
    }

    this._logger.LogDebug("updateUI", "setting to Light", this.optionsValid);
    await StatusBar.setStyle({
      style: Style.Light
    });
  }


}
