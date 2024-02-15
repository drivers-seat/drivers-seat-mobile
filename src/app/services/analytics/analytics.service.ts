import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AverageHourlyPayDetail, AverageHourlyPaySummary, IPerformanceBin } from 'src/app/models/CommunityInsights';
import { Cache } from 'src/app/models/CacheItem';
import { Employer } from 'src/app/models/Employer';
import { ServiceClass } from "src/app/models/ServiceClass";
import { HourlyPayAnalyticsOptions } from 'src/app/models/HourlyPayAnalyticsOptions';
import { dayOfWeek, hourOfDay } from 'src/app/models/UserPreferences';
import { ApiService } from '../api.service';
import { ILogService } from '../logging/log.service';
import { Logger } from '../logging/logger';
import { ILookupDataService } from '../lookup-data/lookup-data.service';
import { IPreferenceService } from '../preferences/preferences.service';

export abstract class IAnalyticsService {

  public abstract getHourlyPayAnalyticsSummary(options: HourlyPayAnalyticsOptions): Promise<AverageHourlyPaySummary[]>;
  public abstract getHourlyPayAnalyticsTrend(options: HourlyPayAnalyticsOptions, day: dayOfWeek, hour: hourOfDay): Promise<AverageHourlyPayDetail[]>;
  public abstract getDisplayValuePropertyDelegate(options: HourlyPayAnalyticsOptions): (AverageHourlyPaySummary) => number;
  public abstract getDisplayTextPropertyDelegate(options: HourlyPayAnalyticsOptions): (AverageHourlyPaySummary) => string;
  public abstract setPerformanceBins(countBins: number, options: HourlyPayAnalyticsOptions, performanceStats: Array<AverageHourlyPaySummary>): IPerformanceBin[];
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService extends IAnalyticsService {

  private readonly _cacheMaintFrequencySeconds: number = 60;
  private readonly _summaryCacheExpirationSeconds: number = 1800;
  private readonly _trendCacheExpirationSeconds: number = 600;
  

  private readonly _logger: Logger;
  private _employers_map: { [key: number]: Employer; };

  private readonly _summaryCache: Cache<AverageHourlyPaySummary[]>;
  private readonly _trendCache: Cache<AverageHourlyPayDetail[]>;

  constructor(
    logSvc: ILogService,
    private readonly _apiSvc: ApiService,
    private readonly _httpSvc: HttpClient,
    private readonly _lookupDataSvc: ILookupDataService,
    private readonly _preferenceSvc: IPreferenceService
  ) {
    super();

    this._logger = logSvc.getLogger("AnalyticsService");

    this._summaryCache = new Cache<AverageHourlyPaySummary[]>("Summary Cache", this._summaryCacheExpirationSeconds, logSvc);
    this._trendCache = new Cache<AverageHourlyPayDetail[]>("Trend Cache", this._trendCacheExpirationSeconds, logSvc);

    this._lookupDataSvc.isReady$.subscribe(ready => {
      if (!ready) {
        return;
      }

      this._employers_map = this._lookupDataSvc.employers_map;
    });
  }

  private mapServiceClassNamesToIds(serviceClassNames: Array<string>): Array<number> {
    return serviceClassNames?.map(scName => ServiceClass.ToServiceClassId(scName));
  }

  public async getHourlyPayAnalyticsSummary(options: HourlyPayAnalyticsOptions): Promise<AverageHourlyPaySummary[]> {

    if (!HourlyPayAnalyticsOptions.isValid(options)) {

      this._logger.LogWarning("getHourlyPayAnalyticsData", "Unable to proces, options invalid", options, HourlyPayAnalyticsOptions.validationMessages(options));
      return [];
    }

    const now = new Date();
    const cacheKey = this.getCacheKeyforSummary(options);

    return await this._summaryCache.getItem(cacheKey, k=> this.getHourlyPayAnalyticsSummaryImpl(options));
  }

  private async getHourlyPayAnalyticsSummaryImpl(options: HourlyPayAnalyticsOptions): Promise<AverageHourlyPaySummary[]> {

    const url = `${this._apiSvc.url()}/analytics/hourly_pay/summary`;

    const postData: any = { ...options };
    postData.service_class_ids = this.mapServiceClassNamesToIds(postData.service_classes);

    return this._httpSvc.post(url, { options: postData }).toPromise()
      .then(data => {
        const stats = data["data"];
        const result = stats.map(s => this.parseHourlyPaySummary(s));
        this._logger.LogInfo("getHourlyPayAnalyticsData", result);
        return result;
      });
  }

  public async getHourlyPayAnalyticsTrend(options: HourlyPayAnalyticsOptions, day: dayOfWeek, hour: hourOfDay): Promise<AverageHourlyPayDetail[]> {

    if (HourlyPayAnalyticsOptions.isValid(options) != true) {

      this._logger.LogWarning("getHourlyPayAnalyticsData", "Unable to proces, options invalid", options, HourlyPayAnalyticsOptions.validationMessages(options));
      return [];
    }
    const cacheKey = this.getCacheKeyforTrend(options, day, hour);

    return await this._trendCache.getItem(cacheKey, k=> this.getHourlyPayAnalyticsTrendImpl(options, day, hour));
  }

  private async getHourlyPayAnalyticsTrendImpl(options: HourlyPayAnalyticsOptions, day: dayOfWeek, hour: hourOfDay): Promise<AverageHourlyPayDetail[]> {

    const url = `${this._apiSvc.url()}/analytics/hourly_pay/trend`;

    const postData: any = { ...options };
    postData.day_of_week = day;
    postData.hour_of_day = hour;
    postData.service_class_ids = this.mapServiceClassNamesToIds(options.service_classes);

    return this._httpSvc.post(url, { options: postData }).toPromise()
      .then(data => {
        const stats = data["data"];
        const result = stats.map(s => this.parseHourlyPayDetail(s));
        this._logger.LogInfo("getHourlyPayAnalyticsData", result);
        return result;
      });
  }

  public getDisplayValuePropertyDelegate(options: HourlyPayAnalyticsOptions): (AverageHourlyPaySummary) => number {

    if (!options) {
      return x => null;
    }

    switch (options.display_value) {
      case 'avgHourlyPay':
        return options.deduct_mileage
          ? x => x.avg_hourly_pay_with_mileage
          : x => x.avg_hourly_pay;
        break;

      case 'bestEmployerPay':
        return options.deduct_mileage
          ? x => x?.best_employer_with_mileage?.avg_hourly_pay_with_mileage
          : x => x?.best_employer?.avg_hourly_pay;
    }

    return x => null;
  }

  public getDisplayTextPropertyDelegate(options: HourlyPayAnalyticsOptions): (AverageHourlyPaySummary) => string {

    if (!options) {
      return null;
    }

    if (options.display_value == 'bestEmployerPay') {
      if (options.deduct_mileage) {
        return x => {
          return x?.best_employer_with_mileage?.employer_id
            ? this._employers_map[x.best_employer_with_mileage.employer_id]?.name?.substring(0, 4)?.toUpperCase()
            : null;
        }
      } else {
        return x => {
          return x?.best_employer?.employer_id
            ? this._employers_map[x.best_employer.employer_id]?.name.substring(0, 4)?.toUpperCase()
            : null;
        }
      }
    }

    return null;
  }

  public setPerformanceBins(countBins: number, options: HourlyPayAnalyticsOptions, performanceStats: Array<AverageHourlyPaySummary>): IPerformanceBin[] {
    this._logger.LogDebug("setPerformanceBins", countBins, options, performanceStats?.length);

    const uniqueValBins: { [key: number]: Array<AverageHourlyPaySummary> } = {};
    const uniqueValues = Array<number>();

    const valuePropFx = this.getDisplayValuePropertyDelegate(options);

    const bins: { [key: number]: IPerformanceBin } = {};

    performanceStats.forEach(stat => {

      const val = valuePropFx(stat);

      if (val == null) {
        stat["perfBin"] = -1;
        return;
      }

      if (!uniqueValBins[val]) {
        uniqueValues.push(val);
        uniqueValBins[val] = Array<AverageHourlyPaySummary>();
      }
      uniqueValBins[val].push(stat);
    });

    uniqueValues.sort((a, b) => a - b);

    const binSize = uniqueValues.length / countBins;

    uniqueValues.forEach((val, idx) => {
      const binId = Math.floor(idx / binSize)
      uniqueValBins[val].forEach(stat => stat["perfBin"] = binId);

      if (!bins[binId]) {
        bins[binId] = {
          binId: binId,
          countItems: 1,
          minValue: val,
          maxValue: val
        };
      } else {
        bins[binId].countItems++;
        bins[binId].minValue = Math.min(val, bins[binId].minValue);
        bins[binId].maxValue = Math.max(val, bins[binId].maxValue);
      }

    })

    const perfBinArray: IPerformanceBin[] = Object.keys(bins)
      .map(x => parseInt(x))
      .sort((a, b) => a - b)
      .map(x => bins[x]);

    this._logger.LogDebug("setPerformanceBins", perfBinArray);

    return perfBinArray;
  }

  private getCacheKeyforSummary(options: HourlyPayAnalyticsOptions){
    return `${options.metro_area_id}:${options.service_classes?.join(",")}:${options.employer_ids?.join(",")}`;
  }

  private getCacheKeyforTrend(options: HourlyPayAnalyticsOptions, day: dayOfWeek, hour:hourOfDay) {
    return `${this.getCacheKeyforSummary(options)}:${day}:${hour}`;
  }

  private parseHourlyPaySummary(data: any): AverageHourlyPaySummary {
    const result = new AverageHourlyPaySummary();

    result.metro_area_id = data.metro_area_id,
      result.for_week = data.for_week,
      result.day_of_week = data.day_of_week;
    result.hour_of_day = data.hour_of_day;

    result.avg_hourly_pay = (data.cents_avg_hourly_pay || 0) / 100;
    result.avg_hourly_pay_with_mileage = (data.cents_avg_hourly_pay_with_mileage || 0) / 100;

    result.best_employer = {
      employer_id: data.best_employer?.employer_id,
      avg_hourly_pay: (data.best_employer?.cents_avg_hourly_pay || 0) / 100,
      avg_hourly_pay_with_mileage: (data.best_employer?.cents_avg_hourly_pay_with_mileage || 0) / 100,
      count_jobs: data.best_employer?.count_jobs,
      count_tasks: data.best_employer?.count_tasks,
      count_workers: data.best_employer?.count_workers
    }

    result.best_employer_with_mileage = {
      employer_id: data.best_employer_with_mileage?.employer_id,
      avg_hourly_pay: (data.best_employer_with_mileage?.cents_avg_hourly_pay || 0) / 100,
      avg_hourly_pay_with_mileage: (data.best_employer_with_mileage?.cents_avg_hourly_pay_with_mileage || 0) / 100,
      count_jobs: data.best_employer_with_mileage?.count_jobs,
      count_tasks: data.best_employer_with_mileage?.count_tasks,
      count_workers: data.best_employer_with_mileage?.count_workers
    }

    result.coverage = {
      deduction_mileage_total: (data.cents_deduction_mileage_total || 0) / 100,
      earnings_total: (data.cents_earnings_total || 0) / 100,
      count_employers: (data.count_employers || 0),
      count_jobs: (data.count_jobs || 0),
      count_service_classes: (data.count_service_classes || 0),
      count_tasks: (data.count_tasks || 0),
      miles_reported_total: parseFloat(data.miles_reported_total || 0),
    }

    return result;
  }

  private parseHourlyPayDetail(data: any): AverageHourlyPayDetail {
    const result = new AverageHourlyPayDetail();

    result.for_week = data.for_week;
    result.employer_id = data.employer_id;
    result.service_class = ServiceClass.ToServiceClassName(data.service_class_id);
    result.count_workers = data.count_workers;
    result.count_weeks = data.count_weeks;
    result.seconds_total = data.seconds_total;

    result.avg_hourly_pay = (data.cents_avg_hourly_pay || 0) / 100;
    result.avg_hourly_pay_with_mileage = (data.cents_avg_hourly_pay_with_mileage || 0) / 100;
    result.deduction_mileage_total = (data.cents_deduction_mileage_total || 0) / 100;
    result.earnings_total = (data.cents_earnings_total || 0) / 100;
    result.miles_reported_total = parseFloat(data.miles_reported_total || 0);
    result.count_jobs = (data.count_jobs || 0);
    result.count_tasks = (data.count_tasks || 0);
    result.count_workers = (data.count_workers || 0);
    result.count_weeks = (data.count_weeks || 0);

    return result;
  }
}
