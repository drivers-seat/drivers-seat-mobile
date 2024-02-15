import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Chart } from 'chart.js';
import { format, getUnixTime } from 'date-fns';
import { TimeHelper } from 'src/app/helpers/TimeHelper';
import { Goal, GoalMeasurement } from 'src/app/models/Goal';
import { StatSummaryLevel, StatsWindow } from 'src/app/models/PerformanceStatistic';
import { IBrowserNavigationService } from 'src/app/services/browser-navigation/browser-navigation.service';
import { IGoalTrackingService } from 'src/app/services/goal-tracking/goal-tracking.service';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import { IModalService } from 'src/app/services/modal/modal.service';
import { StatsService } from 'src/app/services/stats/stats.service';
import { GoalEditComponent } from '../../goals/goal-edit/goal-edit.component';

@Component({
  selector: 'goal-performance',
  templateUrl: './goal-performance.component.html',
  styleUrls: [
    '../stats.scss',
    './goal-performance.component.scss'
  ],
})
export class GoalPerformanceComponent implements OnInit {

  private readonly _logger: Logger;

  public goal: Goal;
  public performance: GoalMeasurement;
  public window: StatsWindow;

  public get hasAnyGoals(): boolean {
    return this._allGoals?.length > 0;
  }

  public get dataIsReady(): boolean {
    return this._allPerformance != null;
  }

  @ViewChild('performanceCanvas')
  private _performanceCanvas: ElementRef;
  private _performanceChart: Chart<"doughnut", number[], unknown>;

  private _allGoals: Goal[];
  private _allActiveGoals: Goal[];
  private _allPerformance: GoalMeasurement[];

  private readonly _styles = [
    {
      performance_percent: 0,
      backgroundColor: "#FF8000"
    },
    {
      performance_percent: .4,
      backgroundColor: "#FAB733"
    },
    {
      performance_percent: .7,
      backgroundColor: "#ACB334"
    },
    {
      performance_percent: .9,
      backgroundColor: "#69B34C"
    },
    {
      performance_percent: 1,
      backgroundColor: "green"
    },
    {
      performance_percent: 2,
      backgroundColor: "darkgreen"
    }
  ]

  private readonly _style_gt100pct = {
    performance_percent: 0,
    backgroundColor: "darkgreen"
  }

  constructor(
    logSvc: ILogService,
    private readonly _goalSvc: IGoalTrackingService,
    private readonly _navSvc: IBrowserNavigationService,
    private readonly _statsSvc: StatsService,
    private readonly _modalSvc: IModalService
  ) {

    this._logger = logSvc.getLogger("GoalPerformanceComponent");

    this._statsSvc.selectedStatsWindow$.subscribe(async w => {
      const oldValue = this.window;
      this.window = w;

      if (this.window?.key != oldValue?.key && this.window?.summaryLevel != StatSummaryLevel.year) {
        await this.refreshStats();
      }
    });

    this._goalSvc.performanceChanged$.subscribe(async w => {

      if (w == this.window?.summaryLevel) {
        await this.refreshStats();
      }
    })

    this._goalSvc.goalsChanged$.subscribe(async w => {

      if (w == this.window?.summaryLevel) {
        this._allGoals = null;
        this._allGoals = await this._goalSvc.getGoals(this.window?.summaryLevel);
      }
    })
  }

  public async refreshStats(): Promise<void> {

    this._allPerformance = null;
    this.performance = null;
    this._allGoals = null;
    this._allActiveGoals = null;
    this.goal = null;

    const perfPromise = this._goalSvc.getPerformance(this.window.summaryLevel, this.window.startRange);
    const goalsPromise = this._goalSvc.getGoals(this.window.summaryLevel);
    const activeGoalsPromise = this._goalSvc.getActiveGoals(this.window.summaryLevel, this.window.startRange);

    await Promise.all([perfPromise, goalsPromise, activeGoalsPromise]);

    this._allGoals = await goalsPromise;
    this._allPerformance = await perfPromise;
    this._allActiveGoals = await activeGoalsPromise;

    this.goal = this._allActiveGoals
      .find(p => p.type == "earnings");

    this.performance = this._allPerformance
      .filter(p => p.type == "earnings")
      .find(p => p.frequency == this._statsSvc.selectedStatsWindow$.value.summaryLevel);

    this.updatePerformanceGraph();
  }

  private updatePerformanceGraph() {

    if (!this.performance) {
      return;
    }

    const matchStyles = this._styles
      .filter(s => s.performance_percent <= this.performance.performance_percent);

    if (matchStyles.length == 0) {
      matchStyles.push(this._style_gt100pct);
    }

    const background_colors = [];
    const data = [];

    if (this.performance.performance_percent < 1) {

      background_colors.push(matchStyles[matchStyles.length - 1].backgroundColor, "#FFFFFF");
      data.push(this.performance.performance_percent, 1 - this.performance.performance_percent);

    } else if (this.performance.performance_percent > 1 && this.performance.performance_percent < 2) {

      background_colors.push(this._style_gt100pct.backgroundColor, matchStyles[matchStyles.length - 1].backgroundColor);
      data.push(this.performance.performance_percent % 1, 1 - (this.performance.performance_percent % 1));

    } else {
      background_colors.push(matchStyles[matchStyles.length - 1].backgroundColor);
      data.push(this.performance.performance_percent);
    }

    const datasets = [{
      data: data,
      backgroundColor: background_colors,
      borderColor: "transparent"
    }]

    if (this._performanceChart) {
      this._performanceChart.data.datasets = datasets;
      this._performanceChart.update();
      return;
    }

    const titleFx = this.getPerformanceChartTitle.bind(this);

    const perfTitlePlugin = {
      id: "perfTitlePlugin",
      afterDatasetsDraw(chart, args, pluginOptions) {
        const { ctx } = chart;
        ctx.save();

        const x = chart.getDatasetMeta(0).data[0].x
        const y = chart.getDatasetMeta(0).data[0].y
        const title = titleFx()

        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(title, x, y);
      }
    }

    this._performanceChart = new Chart(this._performanceCanvas.nativeElement, {
      type: 'doughnut',
      data: {
        datasets: datasets
      },
      options: {
        responsive: true,
        events: [],
        cutout: "60%"
      },
      plugins: [perfTitlePlugin]
    });

    this._performanceChart.tooltip.options.enabled = false;
    this._performanceChart.legend.options.display = false;
  }

  public getPerformanceChartTitle() {
    if (this.performance) {
      return `${Math.round((this.performance.performance_percent || 0) * 100)}%`;
    }
  }

  public async onSettingsClick() {

    if(!this.performance && !this.goalAmount){
      const goal = new Goal();
      goal.type= "earnings";
      goal.frequency = this.window.summaryLevel;
      goal.start_date_unix = this.goal?.start_date_unix || getUnixTime(this.window?.startRange);
      
      await this._modalSvc.open("goal_edit",{
        component: GoalEditComponent,
        componentProps: {
          goal: goal,
          isNew: true
        }});
    }

    this._navSvc.requestNavigation(false, false, false, `/goals?frequency=${this.window.summaryLevel}`);
  }

  public get subGoalName(): string {
    return format(this.window.startRange, "EEEE");
  }

  public get goalAmount(): number {

    if (!this.goal) {
      return null;
    }

    if (this.goal.sub_goals["all"]) {
      return this.goal.sub_goals["all"];
    }

    if (this.window.summaryLevel != StatSummaryLevel.day) {
      return null;
    }

    const dayIdx = TimeHelper.getDayNumber(this.window.startRange);

    return this.goal.sub_goals[`${dayIdx}`];
  }

  ngOnInit() { }
}
