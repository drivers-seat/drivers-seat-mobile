import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { Chart } from 'chart.js';
import { TimeHelper } from 'src/app/helpers/TimeHelper';
import { StatSummaryLevel, StatsWindow } from 'src/app/models/PerformanceStatistic';
import { WorkTimeAndEarningsSummary } from 'src/app/models/WorkTimeAndEarningsSummary';
import { IEarningsService } from 'src/app/services/earnings/earnings.service';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import { StatsService } from 'src/app/services/stats/stats.service';

@Component({
  selector: 'stats-view-work-details',
  templateUrl: './stats-view-work-details.component.html',
  styleUrls: [
    '../stats.scss',
    './stats-view-work-details.component.scss'
  ],
})
export class StatsViewWorkDetailsComponent implements OnInit {

  private readonly _logger: Logger;

  public showPrecise: boolean;

  public summaryStats: WorkTimeAndEarningsSummary;

  public TimeHelper: TimeHelper = TimeHelper.Instance;

  public get windowIsDay(): boolean {
    return this.window?.summaryLevel == StatSummaryLevel.day
  }

  public window: StatsWindow;

  @ViewChild('timeCanvas')
  private _timeCanvas: ElementRef;
  private _timeChart: Chart<"pie", number[], unknown>;


  @ViewChild('mileageCanvas')
  private _mileageCanvas: ElementRef;
  private _mileageChart: Chart<"pie", number[], unknown>;

  constructor(
    logSvc: ILogService,
    private readonly _earningsSvc: IEarningsService,
    private readonly _statsSvc: StatsService
  ) {
    this._logger = logSvc.getLogger("StatsViewWorkDetailsComponent");

    this._statsSvc.statsChanged$.subscribe(async x=>{
      this._logger.LogDebug("StatsChanged",x);
      await this.refreshStats();
    })

    this._statsSvc.selectedStatsWindow$.subscribe(async w => {
      const oldValue = this.window;
      this.window = w;

      if (this.window?.key != oldValue?.key) {
        await this.refreshStats()
      }
    });
  }

  private async refreshStats() {
    this.summaryStats = null;
    
    if (this.window) {

      this.showPrecise = this.window.summaryLevel == StatSummaryLevel.day;
      const summaryResult = await this._earningsSvc.get_work_time_and_earnings_summary(this.window);
      if(summaryResult.window != this.window){
        return;
      }

      this.summaryStats = summaryResult.summary;

      this.updateTimeGraph();
      this.updateMileageGraph();
    }
  }

  public get showMileage(): boolean {
    return this.summaryStats?.selected_miles > 0;
  }

  public get showHours(): boolean {
    return this.summaryStats?.duration_seconds > 0;
  }

  public get showGraphs(): boolean {
    return this.showMileage || this.showHours;
  }

  ngOnInit() { }

  private updateMileageGraph() {

    let dataset;
    if (this.summaryStats?.selected_miles != null) {
      dataset = {
        data: [this.summaryStats.selected_miles_engaged, this.summaryStats.selected_miles_deduction_not_engaged],
        backgroundColor: ["rgba(255, 184, 0, 1)", "silver"],
        borderColor: ["gray"],
        borderWidth: 2
      };
    } else {

      dataset = {
        data: [100],
        backgroundColor: ["whitesmoke"],
        borderColor: ["gray"],
        borderWidth: 2
      }
    }

    if (this._mileageChart) {
      this._mileageChart.data.datasets = [dataset];
      this._mileageChart.update();
      return;
    }

    this._mileageChart = new Chart(this._mileageCanvas.nativeElement, {
      type: 'pie',
      data: {
        datasets: [dataset]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        events: []
      },
    });

    this._mileageChart.tooltip.options.enabled = false;
    this._mileageChart.legend.options.display = false;
  }

  private updateTimeGraph() {

    let dataset = {
      data: [this.summaryStats.duration_seconds_engaged, this.summaryStats.duration_seconds_not_engaged],
      backgroundColor: ["rgba(255, 184, 0, 1)", "silver"],
      borderColor: ["gray"],
      borderWidth: 2
    };

    if (this._timeChart) {
      this._timeChart.data.datasets = [dataset];
      this._timeChart.update();
      return;
    }

    this._timeChart = new Chart(this._timeCanvas.nativeElement, {
      type: 'pie',
      data: {
        datasets: [dataset]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        events: []
      },
    });

    this._timeChart.tooltip.options.enabled = false;
    this._timeChart.legend.options.display = false;
  }

}
