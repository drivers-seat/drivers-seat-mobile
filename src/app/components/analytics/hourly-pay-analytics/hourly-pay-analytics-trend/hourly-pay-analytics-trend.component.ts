import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import Chart from 'chart.js/auto';
import format from 'date-fns/format';
import { TimeHelper } from 'src/app/helpers/TimeHelper';
import { AverageHourlyPayDetail, AverageHourlyPaySummary, IPerformanceBin } from 'src/app/models/CommunityInsights';
import { Employer } from 'src/app/models/Employer';
import { HourlyPayAnalyticsOptions } from 'src/app/models/HourlyPayAnalyticsOptions';
import { PreferenceType } from 'src/app/models/PreferenceType';
import { dayOfWeek } from 'src/app/models/UserPreferences';
import { IAnalyticsService } from 'src/app/services/analytics/analytics.service';
import { IGigPlatformService } from 'src/app/services/gig-platform/gig-platform.service';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import { ILookupDataService } from 'src/app/services/lookup-data/lookup-data.service';
import { IPreferenceService } from 'src/app/services/preferences/preferences.service';
import { IOptionsDisplayValues } from '../hourly-pay-analytics/hourly-pay-analytics.component';
import { IModalService } from 'src/app/services/modal/modal.service';

export interface IStatMatrix {
  [key: number]: {
    [key: string]: AverageHourlyPayDetail
  }
};

@Component({
  selector: 'app-hourly-pay-analytics-trend',
  templateUrl: './hourly-pay-analytics-trend.component.html',
  styleUrls: [
    '../hourly-pay-analytics.scss',
    './hourly-pay-analytics-trend.component.scss'],
})
export class HourlyPayAnalyticsTrendComponent implements OnInit {

  private readonly _logger: Logger;

  public title: string;
  public summary_stat: AverageHourlyPaySummary;
  public trend_stats: Array<AverageHourlyPayDetail>;
  public options: HourlyPayAnalyticsOptions;
  public options_display: IOptionsDisplayValues;
  public count_bins: number;
  public performance_bins: IPerformanceBin[];


  public activeTab: 'rideshare' | 'delivery' = 'delivery';
  public isLookupDataReady: boolean;
  public isReady: boolean;
  public service_classes: string[];
  public current_stats: Array<AverageHourlyPayDetail>;
  public current_stats_matrix: { [key: string]: Array<AverageHourlyPayDetail> };

  @ViewChild('hourlyPayChartDelivery')
  private _hourlyPayDeliveryCanvas: ElementRef;
  private _hourlyPayDeliveryChart: Chart<"line", number[], unknown>;


  @ViewChild('hourlyPayChartRideshare')
  private _hourlyPayRideshareCanvas: ElementRef;
  private _hourlyPayRideshareChart: Chart<"line", number[], unknown>;

  private _statsMatrix: IStatMatrix;
  private _dates: Array<string>;

  private _employersMap: { [key: number]: Employer; };
  private _employersBySvcClass: {
    [key: string]: Array<Employer>
  }


  constructor(
    logSvc: ILogService,
    private readonly _analyticsSvc: IAnalyticsService,
    private readonly _gigPlatformSvc: IGigPlatformService,
    private readonly _modalSvc: IModalService,
    private readonly _lookupDataSvc: ILookupDataService,
    private readonly _preferenceSvc: IPreferenceService
  ) {
    this._logger = logSvc.getLogger("HourlyPayAnalyticsTrendComponent");

    this._lookupDataSvc.isReady$.subscribe(ready => {
      if (!ready) {
        return;
      }

      this._employersMap = this._lookupDataSvc.employers_map;
      this._employersBySvcClass = this._lookupDataSvc.employers_service_class_map;
      this.service_classes = this._lookupDataSvc.service_classes;
    });

    this._preferenceSvc.subscribe(PreferenceType.HourlyPayAnalytics, options => {

      this.options = options?.value;
    });
  }

  ngOnInit() {
    this._logger.LogDebug("ngOnInit", this.summary_stat);

    this.setTitle();
    this._analyticsSvc.getHourlyPayAnalyticsTrend(this.options, this.summary_stat.day_of_week, this.summary_stat.hour_of_day)
      .then(trend => {
        this.trend_stats = trend
        this.initialize();
      });
  }

  public setActiveTab(tab: 'rideshare' | 'delivery') {
    this.activeTab = tab;
  }

  public shouldShowTabs(): boolean {
    return this.current_stats_matrix?.rideshare?.length > 0 &&
      this.current_stats_matrix?.delivery?.length > 0;
  }

  public shouldShowTab(svcClass: string): boolean {
    return this.current_stats_matrix &&
      this.current_stats_matrix[svcClass] != null &&
      this.current_stats_matrix[svcClass].length > 0;
  }

  public isActiveTab(svcClass: string): boolean {
    const hasData = this.shouldShowTab(svcClass);

    return hasData && (!this.shouldShowTabs() || (this.shouldShowTabs() && this.activeTab == svcClass));
  }

  public getEmployerName(employer_id: number): string {

    if (!this._employersMap || !this._employersMap[employer_id]) {
      return "???"
    }

    return this._employersMap[employer_id].name;
  }

  public getEmployerColorBorder(employer: Employer): string {
    return employer == null
      ? "gray"
      : this._gigPlatformSvc.getEmployerColorDark(employer.name) || "gray";
  }

  public async onCancel() {
    await this._modalSvc.dismiss()
  }

  private initialize() {

    if (!this.summary_stat || !this.trend_stats || !this.options) {
      return;
    }

    this.buildCurrentStatsMatrix();
    this.buildDateList();
    this.buildTrendStatsMatrix();

    if (this.current_stats_matrix.delivery && this._hourlyPayDeliveryCanvas?.nativeElement) {
      this._hourlyPayDeliveryChart = this.buildHourlyPayTrendChart(this._employersBySvcClass['delivery'], this._hourlyPayDeliveryCanvas, this._hourlyPayDeliveryChart);
    } else {
      this._logger.LogDebug("initialize", "Not building Delivery chart", this.current_stats_matrix?.delivery);
    }

    if (this.current_stats_matrix.rideshare && this._hourlyPayRideshareCanvas?.nativeElement) {
      this._hourlyPayRideshareChart = this.buildHourlyPayTrendChart(this._employersBySvcClass['rideshare'], this._hourlyPayRideshareCanvas, this._hourlyPayRideshareChart);
    } else {
      this._logger.LogDebug("initialize", "Not building Rideshare chart", this.current_stats_matrix?.ridshare);
    }

    this.isReady = true;
  }

  private setTitle() {

    if (!this.summary_stat) {
      return "";
    }

    let dayName = dayOfWeek[this.summary_stat.day_of_week];
    dayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);
    const hourName = TimeHelper.getHourDisplayName(this.summary_stat.hour_of_day);

    this.title = `${dayName}s at ${hourName}`;
  }


  private buildCurrentStatsMatrix() {
    const statWeek = this.summary_stat.for_week;

    this.current_stats = this.trend_stats.filter(x => x.for_week == statWeek);

    const tempStatsMatrix: { [key: number]: AverageHourlyPayDetail } = {};
    this.trend_stats.forEach(stat => {

      if (stat.for_week == statWeek) {
        tempStatsMatrix[stat.employer_id] = stat;
      } else if (!tempStatsMatrix[stat.employer_id]) {
        tempStatsMatrix[stat.employer_id] = {
          employer_id: stat.employer_id,
          for_week: stat.for_week,
          service_class: stat.service_class,
          count_jobs: null,
          count_tasks: null,
          count_weeks: null,
          count_workers: null,
          seconds_total: null,
          avg_hourly_pay: null,
          avg_hourly_pay_with_mileage: null,
          miles_reported_total: null,
          deduction_mileage_total: null,
          earnings_total: null
        };
      }
    });

    this.current_stats = Object.values(tempStatsMatrix);

    this.current_stats = this.options?.deduct_mileage
      ? this.current_stats.sort((a, b) => (b.avg_hourly_pay_with_mileage || 0) - (a.avg_hourly_pay_with_mileage || 0))
      : this.current_stats.sort((a, b) => (b.avg_hourly_pay || 0) - (a.avg_hourly_pay || 0));

    this.current_stats_matrix = {};
    this.current_stats.forEach(s => {
      this.current_stats_matrix[s.service_class] = this.current_stats_matrix[s.service_class] || new Array<AverageHourlyPayDetail>();
      this.current_stats_matrix[s.service_class].push(s);
    });

    this._logger.LogDebug("buildCurrentStatsMatrix", this.current_stats, this.current_stats_matrix);
  }

  private buildDateList() {
    const dtms = {};
    this.trend_stats.forEach(t => dtms[t.for_week] = true);
    this._dates = Object.keys(dtms).sort();
  }

  private buildTrendStatsMatrix() {

    const statsMatrix: IStatMatrix = {};
    this.trend_stats.forEach(stat => {
      statsMatrix[stat.employer_id] = statsMatrix[stat.employer_id] || {};
      statsMatrix[stat.employer_id][stat.for_week] = stat;
    })

    this._statsMatrix = statsMatrix;
  }

  private buildHourlyPayTrendChart(employers: Array<Employer>, canvas: ElementRef<any>, chartRef: Chart<"line", number[], unknown>): Chart<"line", number[], unknown> {

    this._logger.LogDebug("buildHourlyPayTrendChart", employers, canvas, chartRef);

    const datasets = employers.map(emp => {

      const lineColor = this.getEmployerColorBorder(emp);

      const data = this._dates.map(dtm => {

        const statEmp = this._statsMatrix[emp.id];

        if (statEmp == null) {
          return null;
        }
        const stat = statEmp[dtm];

        return this.options.deduct_mileage
          ? stat?.avg_hourly_pay_with_mileage
          : stat?.avg_hourly_pay
      });

      const dataSet = {
        label: emp.name,
        data: data,
        borderColor: lineColor,
        backgroundColor: lineColor,
        spanGaps: true
      }

      return dataSet;
    });

    const labels = this._dates.map(dtmTxt => format(new Date(dtmTxt), "M/d"));

    if (chartRef) {
      chartRef.data.labels = labels;
      chartRef.data.datasets = datasets;
      chartRef.update();
      return chartRef;
    }

    chartRef = new Chart(canvas.nativeElement, {
      type: 'line',
      data: {
        labels: labels,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: (context) => {
                let label = context.dataset.label || '';

                if (label) {
                  label += ': ';
                }
                if (context.parsed.y !== null) {
                  label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.y);
                }
                return label;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false,
            }
          },
          y: {
            min: 0,
            ticks: {
              callback: (val, idx) => {
                if (typeof val == 'number' && val != 0) {
                  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(val);
                }
                return "";
              }
            }
          }
        },
      },
    });

    chartRef.legend.options.display = false;

    return chartRef;
  }

}
