import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { PerformanceStatistic, StatSummaryLevel } from 'src/app/models/PerformanceStatistic';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import Chart from 'chart.js/auto';
import { StatsHourlyTrendPopupComponent } from '../stats-hourly-trend-popup/stats-hourly-trend-popup.component';
import { IGigPlatformService } from 'src/app/services/gig-platform/gig-platform.service';
import { StatsService } from 'src/app/services/stats/stats.service';
import { IUserSupportService } from 'src/app/services/user-support/user-support.service';
import { KnowledgeBaseArticle } from 'src/app/models/KnowledgeBaseArticle';
import { IModalService } from 'src/app/services/modal/modal.service';
import { TimeHelper } from 'src/app/helpers/TimeHelper';

@Component({
  selector: 'stats-view-by-platform',
  templateUrl: './stats-view-by-platform.component.html',
  styleUrls: [
    '../../../driversseat-styles.scss',
    './stats-view-by-platform.component.scss'
  ],
})
export class StatsViewByPlatformComponent implements OnInit {

  private readonly _logger: Logger;

  private _isModalVisible: boolean = false;

  public noDataAvailable: boolean;
  public dateRangeText: string;
  public hourlyPayTrendEmployers: string[];
  public hourlyPayTrendEmployerStats: any[];

  public visibleModal: any;

  public get hourlyPayTrendEmployer_GroupSize(): number {
    return Math.min(this.hourlyPayTrendEmployers?.length || 0, 3);
  }

  public get hourlyPayTrendEmployer_GroupWidth(): string {
    return `${100 / this.hourlyPayTrendEmployer_GroupSize}%`;
  }

  public hourlyPayTrendEmployer_Groups: Array<Array<string>>;

  constructor(
    logSvc: ILogService,
    private readonly _modalSvc: IModalService,
    private readonly _gigPlatformSvc: IGigPlatformService,
    private readonly _statsSvc: StatsService,
    private readonly _userSupportSvc: IUserSupportService
  ) {
    this._logger = logSvc.getLogger("StatsViewByPlatformComponent");
  }

  @Input()
  set stats(value: PerformanceStatistic) {
    if (value == this._stats) {
      return;
    }

    this._stats = value;
    this.checkForNoData();
    this.buildPayBreakdownChart();
    this.buildTimeBreakdownChart();
  }

  get stats(): PerformanceStatistic {
    return this._stats;
  }

  private _stats: PerformanceStatistic;

  @Input()
  set trendStats(value: PerformanceStatistic[]) {
    if (value == this._trendStats) {
      return;
    }
    this._trendStats = value;
    this.checkForNoData();
    this.updateHourlyPayTrend()
  }

  get trendStats(): PerformanceStatistic[] {
    return this._trendStats;
  }

  private _trendStats: PerformanceStatistic[];

  @Input()
  summaryLevel: StatSummaryLevel;

  @ViewChild('payBreakdownChart')
  private _payBreakoutdownCanvas: ElementRef;
  private _payBreakoutdownChart: Chart<"pie", number[], unknown>;

  @ViewChild('timeBreakdownChart')
  private _timeBreakdownCanvas: ElementRef;
  private _timeBreakdownChart: Chart<"pie", number[], unknown>;

  @ViewChild('hourlyPayTrendChart')
  private _hourlyPayTrendCanvas: ElementRef;
  private _hourlyPayTrendChart: Chart<"line", number[], unknown>;

  ngOnInit() {
  }

  private checkForNoData() {
    this.noDataAvailable = this.stats?.hasNoJobs && this._statsSvc.hasNoJobs(this.trendStats);
    this.dateRangeText = this._statsSvc.getDateRangeText(this.trendStats);
  }

  public getEmployerColorBackground(employer: string): string {
    return employer == null
      ? "white"
      : this._gigPlatformSvc.getEmployerColorLight(employer) || "gray";
  }

  public getEmployerColorBorder(employer: string): string {

    return employer == null
      ? "gray"
      : this._gigPlatformSvc.getEmployerColorDark(employer) || "gray";
  }

  public formatTime(hours: number, minutes: number): string {
    let min = `${minutes || 0}`.padStart(2, "0");
    return `${hours || 0}:${min}`;
  }


  private buildPayBreakdownChart() {

    const datasets = [{
      data: this.stats.employerStats.map(empStat => empStat.totalPayGross),
      backgroundColor: this.stats.employerStats.map(empStat => this.getEmployerColorBackground(empStat.employer)),
      borderColor: this.stats.employerStats.map(empStat => this.getEmployerColorBorder(empStat.employer))
    }]

    if (this._payBreakoutdownChart) {
      this._payBreakoutdownChart.data.datasets = datasets;
      this._payBreakoutdownChart.update();
      return;
    }

    this._logger.LogWarning(this._payBreakoutdownCanvas)

    this._payBreakoutdownChart = new Chart(this._payBreakoutdownCanvas.nativeElement, {
      type: 'pie',
      data: {
        datasets: datasets
      },
      options: {
        responsive: true,
        events: []
      }
    });

    this._payBreakoutdownChart.tooltip.options.enabled = false;
    this._payBreakoutdownChart.legend.options.display = false;
  }

  private buildTimeBreakdownChart() {

    const dataset = {
      data: this.stats.employerStats.map(empStat => empStat.drivingSeconds),
      backgroundColor: this.stats.employerStats.map(empStat => this.getEmployerColorBackground(empStat.employer)),
      borderColor: this.stats.employerStats.map(empStat => this.getEmployerColorBorder(empStat.employer))
    };

    if (this.stats.unpaidSeconds > 0) {
      dataset.data.push(this.stats.unpaidSeconds);
      dataset.backgroundColor.push(this.getEmployerColorBackground(null));
      dataset.borderColor.push(this.getEmployerColorBorder(null));
    }

    const datasets = [dataset];

    if (this._timeBreakdownChart) {
      this._timeBreakdownChart.data.datasets = datasets;
      this._timeBreakdownChart.update();
      return;
    }

    this._timeBreakdownChart = new Chart(this._timeBreakdownCanvas.nativeElement, {
      type: 'pie',
      data: {
        datasets: datasets
      },
      options: {
        responsive: true,
        events: []
      },

    });

    this._timeBreakdownChart.tooltip.options.enabled = false;
    this._timeBreakdownChart.legend.options.display = false;
  }

  private updateHourlyPayTrend() {

    if (this.visibleModal) {
      this.visibleModal.dismiss();
    }

    this.hourlyPayTrendEmployers = Array.from(new Set(
      this.trendStats.map(s =>
        s.employerStats.map(x =>
          x.employer)).flat()));

    this.hourlyPayTrendEmployerStats =
      this.trendStats.map(s => {
        const result = {
          window: s.window
        }

        s.employerStats.forEach(e => {
          result[e.employer] = e;
        })

        return result;
      });

    this.hourlyPayTrendEmployer_Groups = [];
    let grp: Array<string>;
    for (let i = 0; i < this.hourlyPayTrendEmployers.length; i++) {
      if (i % this.hourlyPayTrendEmployer_GroupSize == 0) {
        grp = new Array<string>();
        this.hourlyPayTrendEmployer_Groups.push(grp);
      }
      grp.push(this.hourlyPayTrendEmployers[i]);
    }

    this.buildHourlyPayTrendChart(this.hourlyPayTrendEmployerStats);
  }

  private buildHourlyPayTrendChart(employerStats: any) {

    const datasets = this.hourlyPayTrendEmployers.map(emp => {
      const lineColor = this.getEmployerColorBorder(emp);

      const dataSet = {
        label: emp,
        data: employerStats.map(s => s[emp]?.hourlyPayGross || null),
        borderColor: lineColor,
        backgroundColor: lineColor,
        spanGaps: true
      }

      return dataSet;
    });

    const labels = this._trendStats.map(s => [
      s.window.title1,
      s.window.title2]).filter(x => x);

    if (this._hourlyPayTrendChart) {
      this._hourlyPayTrendChart.data.labels = labels;
      this._hourlyPayTrendChart.data.datasets = datasets;
      this._hourlyPayTrendChart.update();
      return;
    }

    this._hourlyPayTrendChart = new Chart(this._hourlyPayTrendCanvas.nativeElement, {
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
            ticks: {
              callback: (val, idx) => {
                if (typeof val == 'number' && val != 0) {
                  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
                }
                return "";
              }
            }
          }
        },
      },
    });
  }

  public async showHourlyTrendDetail(emp) {

    const name = `home/earnings/${this._stats.window.summaryLevel}/employer/${emp}`;

    this.visibleModal = await this._modalSvc.open(name, {
      showBackdrop: false,
      component: StatsHourlyTrendPopupComponent,
      cssClass: "chart-popup",   //in global.scss
      componentProps: {
        employer: emp,
        hourlyPayStats: this.hourlyPayTrendEmployerStats
      }
    }, {
      employer: emp,
      summary_level: this._stats.window.summaryLevel,
      window_start: TimeHelper.toShortDate(this._stats.window.startRange, true),
      window_end: TimeHelper.toShortDate(this._stats.window.endRange, true),
    });

    await this.visibleModal.onDidDismiss();
    this.visibleModal = null;
  }

  public async showHelp_UpaidTime() {
    await this._userSupportSvc.openKnowledgeBaseArticle(KnowledgeBaseArticle.PaidTime);
  }

}
