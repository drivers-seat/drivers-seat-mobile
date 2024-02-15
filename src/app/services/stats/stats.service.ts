import { Injectable } from '@angular/core';
import { PerformanceStatistic, StatSummaryLevel, StatsWindow } from '../../models/PerformanceStatistic';
import { Cache } from "../../models/CacheItem";
import { addDays, addMonths, addYears, format, parse, startOfDay, startOfMonth, startOfWeek, startOfYear } from 'date-fns';
import { UserService } from '../user.service';
import { ILogService } from '../logging/log.service';
import { Logger } from '../logging/logger';
import { IExpenseService } from '../expenses.service';
import { BehaviorSubject } from 'rxjs';
import { User } from 'src/app/models/User';
import { ApiService } from '../api.service';
import { HttpClient } from '@angular/common/http';
import { UserTrackingService } from '../user-tracking/user-tracking.service';

@Injectable({
  providedIn: 'root'
})
export class StatsService {

  private _selectedStatsWindow: StatsWindow;
  public readonly selectedStatsWindow$: BehaviorSubject<StatsWindow>;

  //The string is the reason why
  public readonly statsChanged$: BehaviorSubject<string> = new BehaviorSubject(null);

  private readonly _logger: Logger;
  private _currentUser: User;

  private readonly _refreshIntervalSeconds: number = 120;
  private readonly _cacheExpirationSeconds: number = 300;

  private readonly _statsCache: Cache<PerformanceStatistic>;

  private readonly _weekOptions: any = {
    weekStartsOn: 1    //Week starts on Monday
  };

  constructor(
    loggerFactory: ILogService,
    private readonly _userSvc: UserService,
    private readonly _expenseSvc: IExpenseService,
    private readonly _apiSvc: ApiService,
    private readonly _httpSvc: HttpClient,
    private readonly _userTrackingSvc: UserTrackingService
  ) {

    this._logger = loggerFactory.getLogger("StatsService");

    //NOT SURE ABOUT THIS
    this._selectedStatsWindow = this.getStatsWindowForDate(new Date(), StatSummaryLevel.week);

    this.selectedStatsWindow$ = new BehaviorSubject(this._selectedStatsWindow);

    this._statsCache = new Cache<PerformanceStatistic>("Performance Stats", this._cacheExpirationSeconds, loggerFactory);

    //automatically clean out cache when the user has changed (ghosting)
    this._userSvc.currentUser$.subscribe(async (u) => this.onUserChanged(u));

    //automatically clean out cache when expenses are added or deleted
    this._expenseSvc.expenseChanged$.subscribe((expense) => {
      this._statsCache.clear();
      this.statsChanged$.next(`Expense changed: ${expense?.id}`);
    });

    this._expenseSvc.expenseDeleted$.subscribe((expenseId) => {
      this._statsCache.clear();
      this.statsChanged$.next(`Expense deleted: ${expenseId}`);
    });

    setInterval(() => {
      this.statsChanged$.next("Interval refresh");
    }, this._refreshIntervalSeconds * 1000);

  }

  private async onUserChanged(u: User) {
    this._logger.LogInfo("Current User Changed", u);
    const oldUser = this._currentUser;
    this._currentUser = u;
    if (this._currentUser?.id == oldUser?.id) {
      return;
    }

    this._statsCache.clear();
    this.statsChanged$.next(`User Changed: ${u?.id}`);
  }

  public setStatsWindow(window: StatsWindow) {

    //just in case
    const normalizedWindow = this.getStatsWindowForDate(window.startRange, window.summaryLevel);

    this._selectedStatsWindow = normalizedWindow;
    this.selectedStatsWindow$.next(this._selectedStatsWindow);
  }

  public async getUserHasAnyData(user: User): Promise<boolean> {

    const endRange = new Date();
    const startRange = addMonths(endRange, -12);
    const startFmt = format(startRange, "yyyy-MM-dd");
    const endFmt = format(endRange, "yyyy-MM-dd");

    const window = new StatsWindow();
    window.startRange = startRange;
    window.endRange = endRange;
    window.summaryLevel = StatSummaryLevel.custom;
    window.title = `${startFmt}-${endFmt}`;

    const stat = await this.getPerformanceStats(this._currentUser.id, window);

    return stat?.hasNoJobs == false;
  }

  public getStatsWindowForDate(date: Date, summaryLevel: StatSummaryLevel): StatsWindow {

    let startRange: Date;
    let endRange: Date;

    switch (summaryLevel) {
      case StatSummaryLevel.week:
        startRange = startOfWeek(date, this._weekOptions);
        endRange = addDays(startRange, 6);
        break;

      case StatSummaryLevel.month:
        startRange = startOfMonth(date);
        endRange = addDays(addMonths(startRange, 1), -1);
        break;

      case StatSummaryLevel.year:
        startRange = startOfYear(date);
        endRange = addDays(addYears(startRange, 1), -1);
        break;

      case StatSummaryLevel.day:
        startRange = startOfDay(date);
        endRange = startRange;
        break;
    }

    return this.getStatsWindow(startRange, endRange, summaryLevel);
  }

  public getStatsWindow(startRange: Date, endRange: Date, summaryLevel: StatSummaryLevel): StatsWindow {
    const result = new StatsWindow();

    result.summaryLevel = summaryLevel;
    result.startRange = startRange;
    result.endRange = endRange;

    switch (summaryLevel) {
      case StatSummaryLevel.week:
        result.title = format(result.startRange, "M/d") + "-" + format(result.endRange, "M/d");
        result.title1 = format(result.startRange, "M/d");
        result.title2 = "";
        break;

      case StatSummaryLevel.month:
        result.title = format(result.startRange, "MMM yyyy");
        result.title1 = format(result.startRange, "MMM")
        result.title2 = format(result.startRange, "yyyy")
        break;

      case StatSummaryLevel.year:
        result.title = format(result.startRange, "yyyy");
        result.title1 = format(result.startRange, "yyyy")
        result.title2 = "";
        break;

      case StatSummaryLevel.day:
        result.title = format(result.startRange, "EEE, M/d/yy");
        result.title1 = format(result.startRange, "EEE")
        result.title2 = format(result.startRange, "M/d")
        break;
    }

    return result;
  }

  public getStatsWindowNext(window: StatsWindow): StatsWindow {

    let normalizedWindow = this.getStatsWindowForDate(window.startRange, window.summaryLevel);

    return this.getStatsWindowForDate(addDays(normalizedWindow.endRange, 1), window.summaryLevel);
  }

  public getStatsWindowPrev(window: StatsWindow): StatsWindow {

    return this.getStatsWindowForDate(addDays(window.startRange, -1), window.summaryLevel);
  }

  public getChildSummaryLevel(level: StatSummaryLevel): StatSummaryLevel {

    switch (level) {
      case StatSummaryLevel.year:
        return StatSummaryLevel.month;
      case StatSummaryLevel.month:
        return StatSummaryLevel.week;
      case StatSummaryLevel.week:
        return StatSummaryLevel.day;
    }

    return null;
  }

  public getParentSummaryLevel(level: StatSummaryLevel): StatSummaryLevel {

    switch (level) {
      case StatSummaryLevel.month:
        return StatSummaryLevel.year;
      case StatSummaryLevel.week:
        return StatSummaryLevel.month;
      case StatSummaryLevel.day:
        return StatSummaryLevel.week;
    }

    return null;
  }

  private getStatsRange(refDate: Date, summaryLevel: StatSummaryLevel, parentWindow: StatsWindow) {

    const window = this.getStatsWindowForDate(refDate, summaryLevel);

    const startDate = window.startRange < parentWindow.startRange
      ? parentWindow.startRange
      : window.startRange;

    const endDate = window.startRange < parentWindow.startRange
      ? parentWindow.startRange
      : window.startRange;

    return {
      start_date: startDate,
      end_date: endDate
    }


  }

  public getChildWindows(window: StatsWindow, adjustBoundsToParent: boolean = false): StatsWindow[] {

    const targetLevel = this.getChildSummaryLevel(window.summaryLevel);
    if (!targetLevel) {
      return [];
    }

    const startDate = window.startRange;
    const endDate = window.endRange;

    const result = new Array<StatsWindow>();

    let childWindow = this.getStatsWindowForDate(window.startRange, targetLevel)
    while (childWindow.startRange <= window.endRange) {

      if (adjustBoundsToParent) {
        if (childWindow.startRange < window.startRange) {
          childWindow.startRange = window.startRange;
        }

        if (childWindow.endRange > window.endRange) {
          childWindow.endRange = window.endRange;
        }
      }

      result.push(childWindow);

      childWindow = this.getStatsWindowNext(childWindow);
    }

    return result;
  }

  //Clears out the cache of values
  public reset() {
    this._statsCache.clear();
    this.statsChanged$.next("Reset was requested");
  }


  public async getLatestPerformanceStats(
    summary_level: StatSummaryLevel){

    const key = `latest_${summary_level}`;

    return await this._statsCache.getItem(key, async k=> {

      const url = `${this._apiSvc.url()}/earnings/summary/${summary_level}/latest`;

      let data = await this._httpSvc.get(url).toPromise();
      data = data["data"];
      
      const start_date =  parse(data["work_date_start"], 'yyyy-MM-dd', new Date());
      const end_date = parse(data["work_date_end"], 'yyyy-MM-dd', new Date());
      const window = this.getStatsWindow(start_date, end_date, summary_level);
      const stat = PerformanceStatistic.parse(data, window);

      this._statsCache.setItem(window.key, stat);

      return stat;
    });
  }

  // Retrieves perf stats from the API server for a user and a time window.
  public async getPerformanceStats(
    userId: number,
    window: StatsWindow
  ): Promise<PerformanceStatistic> {

    let startRangeFmt = format(window.startRange, "yyyy-MM-dd");
    let endRangeFmt = format(window.endRange, "yyyy-MM-dd");

    return await this._statsCache.getItem(window.key, k => this.getPerformanceStatsImpl(window, startRangeFmt, endRangeFmt));
  }

  private async getPerformanceStatsImpl(window: StatsWindow, startRangeFmt: string, endRangeFmt: string): Promise<PerformanceStatistic> {

    const data = await this._httpSvc.get(`${this._apiSvc.url()}/earnings/summary?work_date_start=${startRangeFmt}&work_date_end=${endRangeFmt}`)
      .toPromise()

    const result = PerformanceStatistic.parse(data["data"], window);

    this._logger.LogDebug("Retrieved Performance Stat", window.title, result);

    return result;
  }

  public getComparisonStatistic(currentStat: PerformanceStatistic, prevStat?: PerformanceStatistic): PerformanceStatistic {

    let result = new PerformanceStatistic();

    result.window = currentStat.window;

    result.totalPayGross = (currentStat?.totalPayGross || 0) - (prevStat?.totalPayGross || 0)
    result.totalPayNet = (currentStat?.totalPayNet || 0) - (prevStat?.totalPayNet || 0)

    result.hourlyPayNet = (currentStat?.hourlyPayNet || 0) - (prevStat?.hourlyPayNet || 0)
    result.hourlyPayGross = (currentStat?.hourlyPayGross || 0) - (prevStat?.hourlyPayGross || 0)

    result.jobs = (currentStat?.jobs || 0) - (prevStat?.jobs || 0)
    result.miles = (currentStat?.miles || 0) - (prevStat?.miles || 0)
    result.drivingSeconds = (currentStat?.drivingSeconds || 0) - (prevStat?.drivingSeconds || 0)
    result.drivingPaidSeconds = (currentStat?.drivingPaidSeconds || 0) - (prevStat?.drivingPaidSeconds || 0)
    result.paidTimePercent = (currentStat?.paidTimePercent || 0) - (prevStat?.paidTimePercent || 0)

    result.drivingHours = Math.trunc((result.drivingSeconds || 0) / 60 / 60);
    result.drivingMinutes = Math.trunc(((result.drivingSeconds || 0) / 60) % 60);

    //Round to the nearest minute
    result.drivingSeconds = (result.drivingHours * 60 * 60) + (result.drivingMinutes * 60);
    result.drivingHours = Math.abs(result.drivingHours);
    result.drivingMinutes = Math.abs(result.drivingMinutes);
    result.drivingPaidHours = Math.trunc((result.drivingPaidSeconds || 0) / 60 / 60);
    result.drivingPaidMinutes = Math.trunc(((result.drivingPaidSeconds || 0) / 60) % 60);

    //Round to the nearest minute
    result.drivingPaidSeconds = (result.drivingPaidHours * 60 * 60) + (result.drivingPaidMinutes * 60);
    result.drivingPaidHours = Math.abs(result.drivingPaidHours);
    result.drivingPaidMinutes = Math.abs(result.drivingPaidMinutes);

    return result;
  }

  public hasNoData(stats: PerformanceStatistic[]) {
    return !(stats?.filter(x => x.hasNoData == false)?.length > 0);
  }

  public hasNoWorkData(stats: PerformanceStatistic[]) {
    return !(stats?.filter(x => x.hasNoWorkData == false)?.length > 0)
  }

  public hasNoJobs(stats: PerformanceStatistic[]) {
    return !(stats?.filter(x => x.hasNoJobs == false)?.length > 0);
  }

  public getDateRangeText(stats: PerformanceStatistic[]) {

    if (!stats || stats.length == 0) {
      return "??";
    }

    if (stats.length == 1) {
      return stats[0].window.title;
    }

    const start = stats[0].window.startRange;
    const end = stats[stats.length - 1].window.endRange;

    return `${format(start, "MM/dd/yyyy")} - ${format(end, "MM/dd/yyyy")}`;
  }
}
