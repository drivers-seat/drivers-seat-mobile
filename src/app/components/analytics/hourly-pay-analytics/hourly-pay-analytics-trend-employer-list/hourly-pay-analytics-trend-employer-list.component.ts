import { Component, Input, OnInit } from '@angular/core';
import { AverageHourlyPayDetail, AverageHourlyPaySummary } from 'src/app/models/CommunityInsights';
import { Employer } from 'src/app/models/Employer';
import { HourlyPayAnalyticsOptions } from 'src/app/models/HourlyPayAnalyticsOptions';
import { IAnalyticsService } from 'src/app/services/analytics/analytics.service';
import { IGigPlatformService } from 'src/app/services/gig-platform/gig-platform.service';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import { ILookupDataService } from 'src/app/services/lookup-data/lookup-data.service';

@Component({
  selector: 'hourly-pay-analytics-employer_stats',
  templateUrl: './hourly-pay-analytics-trend-employer-list.component.html',
  styleUrls: [
    '../hourly-pay-analytics.scss',
    './hourly-pay-analytics-trend-employer-list.component.scss'],
})
export class HourlyPayAnalyticsTrendEmployerListComponent implements OnInit {

  private readonly _logger: Logger;

  @Input()
  public trend_stats: Array<AverageHourlyPayDetail>; 

  @Input()
  public summary_stat: AverageHourlyPaySummary;

  @Input()
  public service_class: string;

  @Input()
  public options:HourlyPayAnalyticsOptions;

  public employers: { [key: number]: Employer };
  
  public isReady: boolean;

  constructor(
    logSvc:ILogService,
    private readonly _lookupDataSvc : ILookupDataService,
    private readonly _gigPlatformSvc: IGigPlatformService
  ) { 
    this._logger = logSvc.getLogger("HourlyPayAnalyticsTrendEmployerListComponent");

    this._lookupDataSvc.isReady$.subscribe(ready=>{
      if(!ready){
        return;
      }

      this.employers = this._lookupDataSvc.employers_map;
      this.isReady = true;
    })
  }

  ngOnInit() {}

  public getEmployerColorBackground(employer_id:number): string {

    return employer_id == null || !this.employers
      ? "white"
      : this._gigPlatformSvc.getEmployerColorLight(this.employers[employer_id].name) || "gray";
  }

  public getEmployerColorBorder(employer_id:number): string {

    return employer_id == null || !this.employers
      ? "gray"
      : this._gigPlatformSvc.getEmployerColorDark(this.employers[employer_id].name) || "gray";
  }

}
