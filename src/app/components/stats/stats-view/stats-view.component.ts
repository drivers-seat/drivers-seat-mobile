import { Component, OnInit, Input, ElementRef, ViewChild, OnChanges, SimpleChanges } from '@angular/core';
import { PerformanceStatistic, StatsCompareModel, StatSummaryLevel, StatsWindow } from 'src/app/models/PerformanceStatistic';
import { StatsService } from 'src/app/services/stats/stats.service';
import { Router } from '@angular/router';
import { startOfDay } from 'date-fns';
import { UserService } from 'src/app/services/user.service';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import { AlertController } from '@ionic/angular';
import { IUserSupportService } from 'src/app/services/user-support/user-support.service';
import { KnowledgeBaseArticle } from 'src/app/models/KnowledgeBaseArticle';
import { UserTrackingService } from 'src/app/services/user-tracking/user-tracking.service';
import { WorkTimeEditorComponent } from '../work-time-editor/work-time-editor.component';
import { IGoalTrackingService } from 'src/app/services/goal-tracking/goal-tracking.service';
import { IEarningsService } from 'src/app/services/earnings/earnings.service';
import { IModalService } from 'src/app/services/modal/modal.service';
import { TimeHelper } from 'src/app/helpers/TimeHelper';
import { Location } from '@angular/common';

enum AnalyticsView {
  trend = 'trend',
  employer = 'employer',
  activity = 'activity'
}

@Component({
  selector: 'stats-view',
  templateUrl: './stats-view.component.html',
  styleUrls: [
    '../../../driversseat-styles.scss',
    './stats-view.component.scss'
  ],
})
export class StatsViewComponent implements OnInit {

  private readonly _logger: Logger;

  summaryLevel: StatSummaryLevel;
  window: StatsWindow;

  hasNoData: boolean;
  dateRangeText: string;
  trend_hasNoJobs: boolean;

  summaryStats: StatsCompareModel;
  detailStats: PerformanceStatistic[];
  trendStats: PerformanceStatistic[];

  dataAvailable: boolean = false;

  showDetailStats: boolean;

  detailStatsAvailable: boolean;
  trendStatsAvailable: boolean;

  constructor(
    logSvc: ILogService,
    private readonly _statsSvc: StatsService,
    private readonly _earningSvc: IEarningsService,
    private readonly _userSvc: UserService,
    private readonly _router: Router,
    private readonly _alertCtrl: AlertController,
    private readonly _userSupportSvc: IUserSupportService,
    private readonly _userTrackingSvc: UserTrackingService,
    private readonly _modalSvc: IModalService,
    private readonly _goalSvc: IGoalTrackingService
  ) {
    this._logger = logSvc.getLogger("StatsViewComponent");

    
    this._statsSvc.selectedStatsWindow$.subscribe(async w=>{

      const oldWindow = this.window;
      const oldSummaryLevel = this.summaryLevel;

      this.window = w;
      this.summaryLevel = w.summaryLevel;

      if(this.window?.key != oldWindow?.key || this.summaryLevel != oldSummaryLevel){
        this._logger.LogDebug("selectedStatsWindow$","changed", this.summaryLevel, this.window);
        await this.reset();
      }
    });

    this._statsSvc.statsChanged$.subscribe(async reason => {
      this._logger.LogInfo("Stats Changed", reason);
      await this.reset();
    });
  }

  ngOnInit() {
  }

  public analysisView: AnalyticsView = AnalyticsView.activity;

  possibleAnalysisViews = [];

  private async setPossibleAnalysisViews() {

    const possibleViews = new Array<AnalyticsView>();

    const hasWorkData = this.summaryStats?.current?.hasActivity;

    if(hasWorkData){
      possibleViews.push(AnalyticsView.activity);
    }

    possibleViews.push(AnalyticsView.trend);
    
    if(!this.trend_hasNoJobs){
      possibleViews.push(AnalyticsView.employer);
    }

    this.possibleAnalysisViews = possibleViews;

    if(possibleViews.indexOf(this.analysisView) < 0){
      await this.setAnalysisView(possibleViews[0], false);
    }
  }

  public getAnalysisViewName(analyticsView:AnalyticsView): string {
    switch (analyticsView) {
      case AnalyticsView.trend:
        return "Trend";
      case AnalyticsView.employer:
        return "By App"
      case AnalyticsView.activity:
        return "Activities";
    }
  }

  public async setAnalysisView(view:AnalyticsView, setScreenName: boolean = true) {
    this.analysisView = view;
    
    if(setScreenName) {
      await this.setScreenName()
    }
  }

  private async setScreenName() {

    let eventData = {
      summary_level: this.window.summaryLevel,
      window_start: TimeHelper.toShortDate(this.window.startRange, true),
      window_end: TimeHelper.toShortDate(this.window.endRange, true),
    }

    if (this.window.summaryLevel != StatSummaryLevel.year && this.window.summaryLevel != StatSummaryLevel.custom) {

      const goalPerfPromise = this._goalSvc.getPerformance(this.window.summaryLevel, this.window.startRange)
        .then(goalPerfs => goalPerfs.find(g => g.type == "earnings"));

      const goalDefPromise = this._goalSvc.getActiveGoals(this.window.summaryLevel, this.window.startRange)
        .then(goalPerfs => goalPerfs.find(g => g.type == "earnings"));

      Promise.all([goalPerfPromise, goalDefPromise]);

      const goalPerf = await goalPerfPromise;
      const goalDef = await goalDefPromise;


      if (goalDef) {
        eventData["goal_start"] = TimeHelper.toShortDateUnix(goalDef.start_date_unix, true);

        if (goalDef.sub_goals) {
          Object.keys(goalDef.sub_goals).forEach(k => {
            const key = (k == "all") ? k : TimeHelper.dayNumberToNameMatrix[k];
            eventData[`goal_${key}`] = goalDef.sub_goals[k];
          })
        }
      }

      if (goalPerf) {
        eventData["hasPerformance"] = true;
        const c = { ...goalPerf, ...goalPerf?.additional_info };
        delete c.additional_info;

        eventData = { ...eventData, ...c };
      }
    }

    await this._userTrackingSvc.setScreenName(`home/earnings/${this.window.summaryLevel}/${this.analysisView}`, eventData);
  }

  public get canHaveGoals():boolean {
    return this.summaryLevel && this.summaryLevel != StatSummaryLevel.year;
  }

  ionViewWillEnter() {
    this._logger.LogDebug("ionViewWillEnter");
  }

  //User requests to refresh
  public async refresh() {
    //this will clear the cache and fire off the statsChanged$ event which will cause a refresh
    this._statsSvc.reset();
    this._earningSvc.reset();
    this._goalSvc.reset();
  }

  public async showRefreshTip() {

    const popUp = await this._alertCtrl.create({
      header: "Refresh dashboard?",
      message: "The information on this dashboard is updated every 5 minutes. If you want it to update sooner, you can use this refresh button.",
      cssClass: "pop-up",   //global.scss
      buttons: [
        {
          text: "cancel",
          role: "cancel"
        },
        {
          text: "refresh",
          handler: (x) => {
            this.refresh();
          }
        }
      ]
    });

    popUp.present();

  }

  private async reset() {

    this.dataAvailable = false;

    await this.refreshData();

    this.dataAvailable = true;
  }

  private async refreshData() {

    let userId = this._userSvc.currentUser?.id;

    if (!userId) {
      return;
    }

    let promises = [];

    promises.push(this.getSummaryStats(userId, this.window)
      .then(summaryStats => {
        this.summaryStats = summaryStats;
      }));

    //Don't show breakdown if showing the daily view.
    if (this.summaryLevel != StatSummaryLevel.day) {
      promises.push(this.getDetailStats(userId, this.window)
        .then(detailStats => {
          this.detailStats = detailStats;
        }));
    } else {
      this.detailStats = [];
    }

    promises.push(this.getTrendStats(userId, this.window)
      .then(trendStats => {
        this.trendStats = trendStats;
      }));

    await Promise.all(promises);

    this.hasNoData = (this.summaryStats?.current?.hasNoData != false) &&
      this._statsSvc.hasNoData(this.detailStats) &&
      this._statsSvc.hasNoData(this.trendStats);

    this.dateRangeText = this._statsSvc.getDateRangeText(this.trendStats);

    this.trend_hasNoJobs = this._statsSvc.hasNoJobs(this.trendStats);

    await this.setPossibleAnalysisViews();

    this.setScreenName();
  }

  private async getSummaryStats(userId: number, window: StatsWindow): Promise<StatsCompareModel> {

    let summaryCompareStats = new StatsCompareModel();

    const prevWindow = this._statsSvc.getStatsWindowPrev(window);

    await Promise.all([
      this._statsSvc.getPerformanceStats(userId, this.window)
        .then(stat => {
          summaryCompareStats.current = stat;
        }),
      this._statsSvc.getPerformanceStats(userId, prevWindow)
        .then(stat => {
          summaryCompareStats.prev = stat;
        })
    ]).then(() => {
      summaryCompareStats.comparison = this._statsSvc.getComparisonStatistic(summaryCompareStats.current, summaryCompareStats.prev);
    })

    return summaryCompareStats;
  }

  private async getDetailStats(userId: number, currentWindow: StatsWindow): Promise<PerformanceStatistic[]> {

    let result: PerformanceStatistic[];

    switch (this.summaryLevel) {
      case StatSummaryLevel.week:

        result = await this.getDetailStats_DaysOfWeek(userId, currentWindow);
        break;

      case StatSummaryLevel.month:
        result = await this.getDetailStats_WeeksOfMonth(userId, currentWindow);
        break;

      case StatSummaryLevel.year:
        result = await this.getDetailStats_MonthsOfYear(userId, currentWindow);
        break;

      default:
        result = new Array<PerformanceStatistic>();
        break;
    }

    return result;
  }

  //Break down a monthly stats window into the weeks that make up the month
  private async getDetailStats_WeeksOfMonth(userId: number, currentMonthWidow: StatsWindow): Promise<PerformanceStatistic[]> {

    let promises = new Array<Promise<PerformanceStatistic>>();

    let detailWindow = this._statsSvc.getStatsWindowForDate(currentMonthWidow.startRange, StatSummaryLevel.week);

    do {

      if (detailWindow.startRange < currentMonthWidow.startRange) {
        detailWindow.startRange = currentMonthWidow.startRange;
      }

      if (detailWindow.endRange > currentMonthWidow.endRange) {
        detailWindow.endRange = currentMonthWidow.endRange;
      }

      promises.push(this._statsSvc.getPerformanceStats(userId, detailWindow));

      detailWindow = this._statsSvc.getStatsWindowNext(detailWindow);
    }
    while (detailWindow.startRange < currentMonthWidow.endRange)

    let detailStats = await Promise.all(promises);
    detailStats = detailStats.sort((a, b) => a.window.startRange > b.window.startRange ? 1 : -1);

    return detailStats;
  }

  //Break down a weekly stats window into the days of the week.
  private async getDetailStats_DaysOfWeek(userId: number, currentWeekWindow: StatsWindow): Promise<PerformanceStatistic[]> {

    let promises = new Array<Promise<PerformanceStatistic>>();

    let currentWeekDayWindow = this._statsSvc.getStatsWindowForDate(currentWeekWindow.startRange, StatSummaryLevel.day);

    for (let i = 0; i < 7; i++) {
      promises.push(this._statsSvc.getPerformanceStats(userId, currentWeekDayWindow));
      currentWeekDayWindow = this._statsSvc.getStatsWindowNext(currentWeekDayWindow);
    }

    let detailStats = await Promise.all(promises);
    detailStats = detailStats.sort((a, b) => a.window.startRange > b.window.startRange ? 1 : -1);

    return detailStats;
  }

  private async getDetailStats_MonthsOfYear(userId: number, currentYearWindow: StatsWindow): Promise<PerformanceStatistic[]> {

    this._logger.LogDebug("getDetailStats_MonthsOfYear",currentYearWindow);
    let promises = new Array<Promise<PerformanceStatistic>>();

    let currentMonthWindow = this._statsSvc.getStatsWindowForDate(currentYearWindow.startRange, StatSummaryLevel.month);

    for (let i = 0; i < 12; i++) {
      promises.push(this._statsSvc.getPerformanceStats(userId, currentMonthWindow));
      currentMonthWindow = this._statsSvc.getStatsWindowNext(currentMonthWindow);
    }

    let detailStats = await Promise.all(promises);
    detailStats = detailStats.sort((a, b) => a.window.startRange > b.window.startRange ? 1 : -1);
    this._logger.LogDebug("getDetailStats_MonthsOfYear",detailStats);
    return detailStats;
  }


  private async getTrendStats(userId: number, currentWindow: StatsWindow): Promise<PerformanceStatistic[]> {

    let countSamples: number;
    switch (this.summaryLevel) {
      case StatSummaryLevel.day:
        countSamples = 15;
        break;
      case StatSummaryLevel.week:
        countSamples = 10;
        break;
      case StatSummaryLevel.month:
        countSamples = 13;
        break;
      case StatSummaryLevel.year:
        countSamples = 5;
        break;

    }

    let now = startOfDay(new Date());
    let promises = new Array<Promise<PerformanceStatistic>>();

    //Get samples including and after currentwindow
    let loopWindow = currentWindow;
    for (let i = 0; i < countSamples / 2; i++) {

      promises.push(this._statsSvc.getPerformanceStats(userId, loopWindow));

      if (loopWindow.endRange >= now) {
        break;
      }

      loopWindow = this._statsSvc.getStatsWindowNext(loopWindow);
    }

    //Get samples back in time
    loopWindow = this._statsSvc.getStatsWindowPrev(currentWindow);
    for (let i = promises.length; i < countSamples; i++) {

      promises.push(this._statsSvc.getPerformanceStats(userId, loopWindow));
      loopWindow = this._statsSvc.getStatsWindowPrev(loopWindow);
    }

    let trendStats = await Promise.all(promises);
    trendStats = trendStats.sort((a, b) => a.window.startRange > b.window.startRange ? 1 : -1);

    return trendStats;
  }

  public async showHelp(view: AnalyticsView) {
    switch (view) {
      case AnalyticsView.trend:
        await this._userSupportSvc.openKnowledgeBaseArticle(KnowledgeBaseArticle.TrendStats);
        break;

      case AnalyticsView.employer:
        await this._userSupportSvc.openKnowledgeBaseArticle(KnowledgeBaseArticle.PlatformStats);
        break;

      case AnalyticsView.activity:
        await this._userSupportSvc.openKnowledgeBaseArticle(KnowledgeBaseArticle.ActivityDetail);
        break;
    }
  }

  public goto_Profile() {
    this._router.navigateByUrl('gig-accounts');
  }

  public async onEditWorkTimeClick(){
    
    const name = `home/earnings/${this.window.summaryLevel}/activities/workTimeEdit`;

    await this._modalSvc.open(name, {
      showBackdrop: false,
      component: WorkTimeEditorComponent,
      componentProps: {
        work_date: this.window.startRange
      }
    }, {
      date: TimeHelper.toShortDate(this.window.startRange, true)
    });
  }
}