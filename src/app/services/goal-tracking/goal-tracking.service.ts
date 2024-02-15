import { ElementRef, Injectable } from '@angular/core';
import { ILogService } from '../logging/log.service';
import { Logger } from '../logging/logger'
import { StatSummaryLevel } from 'src/app/models/PerformanceStatistic';
import { Goal, GoalMeasurement, GoalMeasurementInfoEarnings } from 'src/app/models/Goal';
import { UserService } from '../user.service';
import { ApiService } from '../api.service';
import { Cache } from '../../models/CacheItem';
import { User } from 'src/app/models/User';
import { HttpClient } from '@angular/common/http';
import { format, fromUnixTime, getUnixTime, parse } from 'date-fns';
import { BehaviorSubject } from 'rxjs';
import { UserTrackingService } from '../user-tracking/user-tracking.service';
import { TrackedEvent } from 'src/app/models/TrackedEvent';
import { TimeHelper } from 'src/app/helpers/TimeHelper';
import { Chart } from 'chart.js';

export abstract class IGoalTrackingService {

  public abstract goalsChanged$: BehaviorSubject<StatSummaryLevel>;
  public abstract performanceChanged$: BehaviorSubject<StatSummaryLevel>;
  public abstract getGoals(frequency: StatSummaryLevel): Promise<Goal[]>;
  public abstract saveGoal(goal: Goal, replace_start_date_unix?: number): Promise<void>;
  public abstract deleteGoal(goal: Goal): Promise<void>;
  public abstract getPerformance(frequency: StatSummaryLevel, date: Date): Promise<GoalMeasurement[]>;
  public abstract getActiveGoals(frequency: StatSummaryLevel, date: Date): Promise<Goal[]>;
  public abstract reset();
  public abstract updatePerformanceDonutChart(performance:GoalMeasurement,
    canvas: ElementRef<any>,
    existingChart?: Chart<"doughnut", number[], unknown>): Chart<"doughnut", number[], unknown>;
}

@Injectable({
  providedIn: 'root'
})
export class GoalTrackingService implements IGoalTrackingService {

  private readonly _daysOfWeek: string[];

  public goalsChanged$: BehaviorSubject<StatSummaryLevel> = new BehaviorSubject(null);
  public performanceChanged$: BehaviorSubject<StatSummaryLevel> = new BehaviorSubject(null);

  private readonly _refreshTimeoutChanges: number = 10;

  private readonly _refreshIntervalSeconds: number = 120;
  private readonly _cache_expiration_seconds_goal = 600;
  private readonly _cache_expiration_seconds_perf = 600;
  private readonly _logger: Logger;
  private readonly _goalsCache: Cache<Goal[]>;
  private readonly _goalPerfCache: Cache<GoalMeasurement[]>;

  private readonly _dayNameToNumberMatrix: { [key: string]: number }
  private readonly _dayNumberToNameMatrix: { [key: number]: string }

  private _user: User;

  constructor(
    logSvc: ILogService,
    private readonly _userSvc: UserService,
    private readonly _apiSvc: ApiService,
    private readonly _httpSvc: HttpClient,
    private readonly _userTrackingSvc: UserTrackingService
  ) {
    this._logger = logSvc.getLogger("GoalTrackingService");

    this._logger.LogDebug(this._dayNameToNumberMatrix, this._dayNumberToNameMatrix);

    this._goalsCache = new Cache<Goal[]>("goals", this._cache_expiration_seconds_goal, logSvc);

    this._goalPerfCache = new Cache<GoalMeasurement[]>("goalPerformance", this._cache_expiration_seconds_perf, logSvc);

    this._userSvc.currentUser$.subscribe(u => {
      const oldUserId = this._user?.id
      this._user = u;

      if (u?.id == oldUserId) {
        return;
      }

      this.reset();
    })

    setInterval(this.notifyChanges.bind(this), this._refreshIntervalSeconds * 1000);
  }

  public async getGoals(frequency: StatSummaryLevel): Promise<Goal[]> {

    return await this._goalsCache.getItem(`${frequency}`, async k => {

      const url = `${this._apiSvc.url()}/goals/${k}`

      const data = await this._httpSvc.get(url).toPromise()

      const goals = (data && data["data"] && Array.isArray(data["data"]))
        ? data["data"].map(x => this.parseGoal(x)).sort((a, b) => b.start_date_unix - a.start_date_unix)
        : [];

      this._logger.LogWarning(goals);
      return goals;
    });
  }

  public async getActiveGoals(frequency: StatSummaryLevel, date: Date): Promise<Goal[]> {

    const all_goals = await this.getGoals(frequency);

    const date_unix = getUnixTime(date);

    const result: { [key: string]: Goal } = {};

    [...all_goals]
      .sort((a, b) => a.start_date_unix - b.start_date_unix)
      .filter(g => g.start_date_unix <= date_unix)
      .forEach(g => result[g.type] = g);

    return Object.values(result);
  }

  public async saveGoal(goal: Goal, replace_start_date_unix?: number) {

    if(this._apiSvc.isGhosting){
      this._logger.LogInfo("saveGoal","Ignoring Request to save goals while ghosting");
      return;
    }

    const startDateFmt = format(fromUnixTime(goal.start_date_unix), "yyyy-MM-dd");

    let url = `${this._apiSvc.url()}/goals/${goal.type}/${goal.frequency}/${startDateFmt}`;

    if (replace_start_date_unix) {
      url += `?replace=${format(fromUnixTime(replace_start_date_unix), "yyyy-MM-dd")}`;
    }

    //copy the model and convert to cents
    const postData = { ...goal };
    postData.sub_goals = { ...postData.sub_goals };
    Object.keys(postData.sub_goals).forEach(k => postData.sub_goals[k] = parseInt(`${postData.sub_goals[k] * 100}`))

    const data = await this._httpSvc.post(url, postData).toPromise();

    const goals = (data && data["data"] && Array.isArray(data["data"]))
      ? data["data"].map(x => this.parseGoal(x)).sort((a, b) => b.start_date_unix - a.start_date_unix)
      : [];

    this._goalsCache.setItem(`${goal.frequency}`, goals);
    await this.recordEventAboutGoal(TrackedEvent.goal_set, goal, replace_start_date_unix);

    this.reset_performance();
    setTimeout(this.reset_performance.bind(this), this._refreshTimeoutChanges * 500);
    setTimeout(this.reset_performance.bind(this), this._refreshTimeoutChanges * 2000);
    setTimeout(this.reset_performance.bind(this), this._refreshTimeoutChanges * 3000);
  }

  public async deleteGoal(goal: Goal) {

    if(this._apiSvc.isGhosting){
      this._logger.LogInfo("deleteGoal","Ignoring Request to delete goal while ghosting");
      return;
    }

    const startDateFmt = format(fromUnixTime(goal.start_date_unix), "yyyy-MM-dd");

    const url = `${this._apiSvc.url()}/goals/${goal.type}/${goal.frequency}/${startDateFmt}`;

    const data = await this._httpSvc.delete(url).toPromise();

    const goals = (data && data["data"] && Array.isArray(data["data"]))
      ? data["data"].map(x => this.parseGoal(x)).sort((a, b) => b.start_date_unix - a.start_date_unix)
      : [];

    this._goalsCache.setItem(`${goal.frequency}`, goals);
    await this.recordEventAboutGoal(TrackedEvent.goal_delete, goal, null);

    this.reset_performance();
    setTimeout(this.reset_performance.bind(this), this._refreshTimeoutChanges * 1000);
    setTimeout(this.reset_performance.bind(this), this._refreshTimeoutChanges * 2000);
    setTimeout(this.reset_performance.bind(this), this._refreshTimeoutChanges * 3000);
  }

  private async recordEventAboutGoal(eventType: TrackedEvent, goal: Goal, replace_start_date_unix?: number) {

    const eventData = {
      type: `${goal.type}`,
      frequency: `${goal.frequency}`,
      start_date: format(fromUnixTime(goal.start_date_unix), "yyyy-MM-dd"),
    }

    if (replace_start_date_unix) {
      eventData["start_date_before"] = format(fromUnixTime(replace_start_date_unix), "yyyy-MM-dd");
    }

    Object.keys(goal.sub_goals).forEach(k => {
      const key = (k == "all") ? k : TimeHelper.dayNumberToNameMatrix[k];
      eventData[`amount_${key}`] = goal.sub_goals[k];
    })

    await this._userTrackingSvc.captureEvent(eventType, eventData);
  }

  public async getPerformance(frequency: StatSummaryLevel, date: Date): Promise<GoalMeasurement[]> {

    const dateUnix = getUnixTime(date);

    const key = `${frequency}/${dateUnix}`;

    return await this._goalPerfCache.getItem(key, async k => {

      const dateFmt = format(date, "yyyy-MM-dd");

      const url = `${this._apiSvc.url()}/goals/performance/${frequency}/${dateFmt}`;

      const data = await this._httpSvc.get(url).toPromise();

      const perf = (data && data["data"] && Array.isArray(data["data"]))
        ? data["data"].map(x => this.parseGoalPerformance(x))
        : [];

      this._logger.LogDebug("getPerformance", frequency, date, perf);

      return perf;
    });
  }

  private readonly _perfChartStyles = [
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


  private readonly _perStyleGT100Pct = {
    performance_percent: 0,
    backgroundColor: "darkgreen"
  }
  
  public getPerformanceChartTitle(performance: GoalMeasurement) {
    if (performance) {
      return `${Math.round((performance.performance_percent || 0) * 100)}%`;
    }
  }

  public updatePerformanceDonutChart(performance:GoalMeasurement,
    canvas: ElementRef<any>,
    existingChart?: Chart<"doughnut", number[], unknown>): Chart<"doughnut", number[], unknown> {

    existingChart?.destroy();

    if (!performance) {
      return;
    }

    const matchStyles = this._perfChartStyles
      .filter(s => s.performance_percent <= performance.performance_percent);

    if (matchStyles.length == 0) {
      matchStyles.push(this._perStyleGT100Pct);
    }

    const background_colors = [];
    const data = [];

    if (performance.performance_percent < 1) {

      background_colors.push(matchStyles[matchStyles.length - 1].backgroundColor, "#FFFFFF");
      data.push(performance.performance_percent, 1 - performance.performance_percent);

    } else if (performance.performance_percent > 1 && performance.performance_percent < 2) {

      background_colors.push(this._perStyleGT100Pct.backgroundColor, matchStyles[matchStyles.length - 1].backgroundColor);
      data.push(performance.performance_percent % 1, 1 - (performance.performance_percent % 1));

    } else {
      background_colors.push(matchStyles[matchStyles.length - 1].backgroundColor);
      data.push(performance.performance_percent);
    }

    const datasets = [{
      data: data,
      backgroundColor: background_colors,
      borderColor: "transparent"
    }]

    const titleFx = ()=> this.getPerformanceChartTitle(performance);

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

    existingChart = new Chart(canvas.nativeElement, {
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

    existingChart.tooltip.options.enabled = false;
    existingChart.legend.options.display = false;

    return existingChart;    
  }


  public reset() {
    this._goalPerfCache.clear();
    this._goalsCache.clear();

    this.notifyChanges();
  }

  private reset_performance() {
    this._goalPerfCache.clear();
    this.notifyChanges();
  }

  private notifyChanges() {
    [StatSummaryLevel.day, StatSummaryLevel.week, StatSummaryLevel.month].forEach(summaryLevel => {
      this.goalsChanged$.next(summaryLevel);
      this.performanceChanged$.next(summaryLevel);
    });
  }

  private parseGoal(data: any): Goal {
    var goal = new Goal();

    goal.type = data["type"];

    const x: keyof typeof StatSummaryLevel = data["frequency"];
    goal.frequency = StatSummaryLevel[x];


    if (data["start_date"]) {
      goal.start_date_unix = getUnixTime(parse(data["start_date"], "yyyy-MM-dd", new Date()));
    }

    goal.sub_goals = {};

    if (data["sub_goals"]) {
      Object.keys(data["sub_goals"]).forEach(k => {
        if (data["sub_goals"][k]) {
          goal.sub_goals[k] = data["sub_goals"][k] / 100;
        }
      });
    }

    return goal;
  }

  private parseGoalPerformance(data: any): GoalMeasurement {

    const meas = new GoalMeasurement();

    meas.type = data["type"];

    const x: keyof typeof StatSummaryLevel = data["frequency"];
    meas.frequency = StatSummaryLevel[x];

    const date = parse(data["window_date"], "yyyy-MM-dd", new Date());
    meas.window_date_unix = getUnixTime(date);

    meas.goal_amount = data["goal_amount"];
    meas.performance_amount = data["performance_amount"];

    if (data["performance_percent"]) {
      meas.performance_percent = parseFloat(`${data["performance_percent"]}`);
    }

    switch (meas.type) {
      case "earnings":
        this.parseGoalPerformance_earnings(data, meas)
        break;
    }
    return meas;
  }

  private parseGoalPerformance_earnings(data: any, meas: GoalMeasurement) {

    if (data["performance_amount"]) {
      meas.performance_amount = data["performance_amount"] / 100;
    }

    if (data["goal_amount"]) {
      meas.goal_amount = data["goal_amount"] / 100;
    }

    meas.additional_info = new GoalMeasurementInfoEarnings();

    const info_data = data["additional_info"];

    if (info_data) {

      meas.additional_info.count_work_days = info_data["count_work_days"];
      meas.additional_info.count_jobs = info_data["count_jobs"];
      meas.additional_info.count_tasks = info_data["count_tasks"];
      meas.additional_info.count_activities = info_data["count_activities"];
      meas.additional_info.duration_seconds = info_data["duration_seconds"];
      meas.additional_info.duration_seconds_engaged = info_data["duration_seconds_engaged"];

      if (info_data["selected_miles"]) {
        meas.additional_info.selected_miles = parseFloat(`${info_data["selected_miles"]}`);
      }

      if (info_data["selected_miles_engaged"]) {
        meas.additional_info.selected_miles_engaged = parseFloat(`${info_data["selected_miles_engaged"]}`);
      }

      if (info_data["earnings_pay_cents"]) {
        meas.additional_info.earnings_pay = info_data["earnings_pay_cents"] / 100;
      }

      if (info_data["earnings_pay_tip"]) {
        meas.additional_info.earnings_tip = info_data["earnings_pay_tip_cents"] / 100;
      }

      if (info_data["earnings_bonus"]) {
        meas.additional_info.earnings_bonus = info_data["earnings_bonus_cents"] / 100;
      }

      if (info_data["earnings_total"]) {
        meas.additional_info.earnings_total = info_data["earnings_total_cents"] / 100;
      }
    }

    this._logger.LogDebug(meas)
  }
}
