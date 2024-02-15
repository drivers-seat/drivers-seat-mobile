import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { Chart } from 'chart.js';
import { PerformanceStatistic, StatsCompareModel, StatSummaryLevel, StatsWindow } from 'src/app/models/PerformanceStatistic';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import { StatsService } from 'src/app/services/stats/stats.service';
import { IUserSupportService } from 'src/app/services/user-support/user-support.service';

@Component({
  selector: 'stats-view-trend',
  templateUrl: './stats-view-trend.component.html',
  styleUrls: [
    '../../../driversseat-styles.scss',
    './stats-view-trend.component.scss'
  ],
})
export class StatsViewTrendComponent implements OnInit {

  private readonly _logger: Logger;

  @Input()
  public set summaryLevel(value: StatSummaryLevel) {
    if (value == this._summaryLevel) {
      return;
    }

    this._summaryLevel = value;

    this.reset();
  }

  public get summaryLevel(): StatSummaryLevel {
    return this._summaryLevel;
  }

  private _summaryLevel: StatSummaryLevel;

  @Input("window")
  set window(value: StatsWindow) {
    if (value == this._window) {
      return;
    }
    this._window = value;
    this.reset();
  }

  get window(): StatsWindow {
    return this._window;
  }

  private _window: StatsWindow;


  @Input()
  set summaryStats(value: StatsCompareModel) {
    if (value == this._summaryStats) {
      return;
    }

    this._summaryStats = value;
  }

  get summaryStats(): StatsCompareModel {
    return this._summaryStats;
  }

  private _summaryStats: StatsCompareModel;


  @Input()
  set detailStats(value: PerformanceStatistic[]) {
    if (value == this._detailStats) {
      return;
    }
    this._detailStats = value;

    this.reset();
  }

  get detailStats(): PerformanceStatistic[] {
    return this._detailStats;
  }

  private _detailStats: PerformanceStatistic[];


  @Input()
  set trendStats(value: PerformanceStatistic[]) {
    if (value == this._trendStats) {
      return;
    }

    this._trendStats = value;
    this.reset();
  }

  get trendStats(): PerformanceStatistic[] {
    return this._trendStats;
  }

  private _trendStats: PerformanceStatistic[];

  public showDetailStats: boolean = true;
  public detailLevel: StatSummaryLevel;

  @ViewChild('trendCanvas')
  private _trendCanvas: ElementRef;
  private _trendChart: Chart<"bar", number[], string[]>;

  @ViewChild('detailCanvas')
  private _detailCanvas: ElementRef;
  private _detailChart: Chart<"bar", number[], string[]>;

  constructor(
    logSvc: ILogService,
    private readonly _statsSvc: StatsService,
    private readonly _userSupportSvc: IUserSupportService
  ) {
    this._logger = logSvc.getLogger("StatsViewComponent");
  }

  ngOnInit() { }

  detailStats_hasNoData: boolean;
  detailStats_dateRangeText: string;

  trendStats_hasNoData: boolean;


  private reset() {

    switch (this.summaryLevel) {

      case StatSummaryLevel.year:
        this.showDetailStats = true;
        this.detailLevel = StatSummaryLevel.month;
        break;

      case StatSummaryLevel.month:
        this.showDetailStats = true;
        this.detailLevel = StatSummaryLevel.week;
        break;

      case StatSummaryLevel.week:
        this.showDetailStats = true;
        this.detailLevel = StatSummaryLevel.day;
        break;

      default:
        this.showDetailStats = false;
        this.detailLevel = null;
    }

    this.detailStats_dateRangeText = this._statsSvc.getDateRangeText(this.detailStats);

    this.detailStats_hasNoData = !this.detailStats || this._statsSvc.hasNoData(this.detailStats);
    if (!this.detailStats_hasNoData) {
      this.buildDetailChart(this.detailStats);
    }

    this.trendStats_hasNoData = !this.trendStats || this._statsSvc.hasNoData(this.trendStats);
    if (!this.trendStats_hasNoData) {
      this.buildTrendChart(this.trendStats);
    }
  }

  private updateChart(chartRef: Chart<"bar", number[], string[]>, canvas: ElementRef, stats: PerformanceStatistic[]): Chart<"bar", number[], string[]> {

    //Based on the number of items in the chart, try to make the line width for net pay
    //cover most of the bar.
    const pointRadiusNetPay = stats.length < 5
      ? 18
      : stats.length < 8
        ? 15
        : 6;

    const colorNetProfit = "rgba(0,184,118,1)";
    const colorNetLoss = "rgba(211,0,114,1)";
    const colorTotalPay = "rgba(255, 184, 0, 1)";
    const colorTotalPayCurrent = "rgba(255, 184, 0, .4)";
    const colorMileage = "rgba(192, 192, 192, 1)";
    const colorMileageCurrent = "rgba(192, 192, 192, .4)";
    const colorExpense = "rgba(128, 128, 128, 1)";
    const colorExpenseCurrent = "rgba(128, 128, 128, .4)";
    const colorSelected = "rgba(50,63,255,1)";
    const colorGrid = "rgba(192, 192, 192, .4)";
    const colorGridBaseline = "rgba(192, 192, 192, 1)";

    var currentWindow = this._statsSvc.getStatsWindowForDate(new Date(), this.summaryLevel);

    let labels = stats.map(stat => {
      let result = [stat.window.title1];
      if (stat.window.title2) {
        result.push(stat.window.title2)
      }
      return result
    });

    let maxGrossPay = Math.max(...stats.map(x => x.totalPayGross));
    let maxExpense = Math.max(...stats.map(x => x.expensesDeductible || 0));

    let rangeMax = Math.max(maxGrossPay, maxExpense * .5, 100);
    let rangeMin = 0 - Math.max(maxExpense, maxGrossPay * .5, 100);

    let datasets = [];
    datasets.push(
      {
        label: "Gross Pay",
        type: 'bar',
        data: stats.map(x => x.totalPayGross),
        backgroundColor: stats.map(x => x.window.key == currentWindow.key ? colorTotalPayCurrent : colorTotalPay),
        borderColor: stats.map(x => x.window.key == this.window.key ? colorSelected : colorTotalPay),
        borderWidth: 2,
        stack: 'Stack 0',
        order: 1
      }, {
        label: "Other Expenses",
        type: 'bar',
        data: stats.map(x => 0 - x.expensesDeductible),
        backgroundColor: stats.map(x => x.window.key == currentWindow.key ? colorExpenseCurrent : colorExpense),
        borderColor: stats.map(x => x.window.key == this.window.key ? colorSelected : colorExpense),
        borderWidth: 2,
        stack: 'Stack 0',
        order: 1
      });

    let chartNeedsUpdate = true;
    if (!chartRef) {

      chartNeedsUpdate = false;

      chartRef = new Chart(canvas.nativeElement, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: datasets
        }
      });
    }

    chartRef.options = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'x'
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
          suggestedMin: rangeMin,
          suggestedMax: rangeMax,
          grid: {
            color: (context) => {
              return context.tick?.value == 0
                ? colorGridBaseline
                : colorGrid
            }
          },
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
    };

    chartRef.data.labels = labels;
    chartRef.data.datasets = datasets;

    chartRef.legend.options.display = false;

    //sometimes the chart has a value randomly selected, this will prevent this
    chartRef.tooltip?.setActiveElements([], { x: 0, y: 0 });

    if (chartNeedsUpdate) {
      chartRef.update();
    }

    //makes sure that there is a tick at zero without a label.  This has to happen AFTER the chart.update()
    let baselineTick = chartRef.scales.y.ticks.find(x => x.value == 0);
    if (!baselineTick) {
      chartRef.scales.y.ticks.push({
        value: 0,
        label: "",
        major: false
      });
    } else {
      baselineTick.label = "";
    }

    return chartRef;
  }

  private buildTrendChart(trendStats: PerformanceStatistic[]) {

    this._trendChart = this.updateChart(this._trendChart, this._trendCanvas, this.trendStats);
  }

  private buildDetailChart(detailStats: PerformanceStatistic[]) {

    this._detailChart = this.updateChart(this._detailChart, this._detailCanvas, this.detailStats);
  }
}
