import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { StatusBar } from '@capacitor/status-bar';
import { Chart } from 'chart.js';
import { getUnixTime } from 'date-fns';
import { TextHelper } from 'src/app/helpers/TextHelper';
import { Goal, GoalMeasurement } from 'src/app/models/Goal';
import { DashboardEarningsOptions } from 'src/app/models/HourlyPayAnalyticsOptions';
import { PerformanceStatistic, StatSummaryLevel, StatsWindow } from 'src/app/models/PerformanceStatistic';
import { PreferenceType } from 'src/app/models/PreferenceType';
import { User } from 'src/app/models/User';
import { IBrowserNavigationService } from 'src/app/services/browser-navigation/browser-navigation.service';
import { IGoalTrackingService } from 'src/app/services/goal-tracking/goal-tracking.service';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import { IModalService } from 'src/app/services/modal/modal.service';
import { IPreferenceService } from 'src/app/services/preferences/preferences.service';
import { StatsService } from 'src/app/services/stats/stats.service';
import { UserService } from 'src/app/services/user.service';
import { GoalEditComponent } from '../../goals/goal-edit/goal-edit.component';
import { IGigAccountManagementService } from 'src/app/services/gig-account-management/gig-account-management.service';
import { ArgyleGigAccount } from 'src/app/models/Argyle';

@Component({
  selector: 'dashboard-earnings-summary',
  templateUrl: './earnings-summary.component.html',
  styleUrls: [
    '../dashboard.scss',
    './earnings-summary.component.scss'
  ],
})
export class EarningsSummaryComponent implements OnInit {

  private readonly _logger: Logger;

  private readonly _refreshIntervalSeconds: number = 120;

  public readonly TextHelper: TextHelper = TextHelper.instance;

  @ViewChild('performanceCanvas')
  private _performanceCanvas: ElementRef;
  private _performanceChart: Chart<"doughnut", number[], unknown>;

  public isLoading: boolean;

  public level: StatSummaryLevel;

  public currentWindow: StatsWindow;

  public hasNoData:boolean;

  public readonly levels: any = [
    { display: "daily", level: StatSummaryLevel.day},
    { display: "weekly", level: StatSummaryLevel.week},
    { display: "monthly", level: StatSummaryLevel.month},
    { display: "yearly", level: StatSummaryLevel.year},
  ]

  private _options: DashboardEarningsOptions

  public stats: PerformanceStatistic;
  public goal: GoalMeasurement;

  public get showGoal(): boolean {
    return this.level && this.level != StatSummaryLevel.year;
  }

  public get currentUser(): User {
    return this._userSvc.currentUser$.value;
  }

  private _gigAccounts:ArgyleGigAccount[];

  public get hasGigAccounts(): boolean{
    return this._gigAccounts?.length > 0;
  }

  public get gigAccountNames() : string[]{
    return this._gigAccounts?.map(x=>x.link_item || x.data_partner)
      .filter(x=>x != null)
      .map(x=>TextHelper.capitalizeFirstLetter(x))
  }

  public get gigAccountsDesc() : string{

    const gigAccountNames = this.gigAccountNames;
    return this.gigAccountNames.length > 1
      ? `${TextHelper.toFriendlyCsv("and", this.gigAccountNames)} accounts`
      : `${this.gigAccountNames[0]} account`
  }

  constructor(
    logSvc: ILogService,
    private readonly _userSvc: UserService,
    private readonly _statsSvc: StatsService,
    private readonly _goalSvc: IGoalTrackingService,
    private readonly _gigAcctSvc: IGigAccountManagementService,
    private readonly _prefSvc: IPreferenceService,
    private readonly _modalSvc: IModalService,
    private readonly _browserNavSvc: IBrowserNavigationService
  ) {

    this._logger = logSvc.getLogger("EarningsSummaryComponent");

    this._goalSvc.goalsChanged$.subscribe(async (statLevel)=>{
      if(statLevel == this.level){
        await this.refreshData(false);
      }
    });

    this._goalSvc.performanceChanged$.subscribe(async(statLevel)=>{
      if(statLevel == this.level){
        await this.refreshData(false);
      }
    })

    this._gigAcctSvc.linkedAccounts$.subscribe(accts=>{
      this._gigAccounts = accts;
    })

    this._userSvc.currentUser$.subscribe(async(user)=>{
      this.refreshData();
    })

    this._prefSvc.subscribe(PreferenceType.DashboardEarnings, async pref => {
      
      this._logger.LogDebug("PreferenceType.DashboardEarnings changed", pref);

      let options = <DashboardEarningsOptions>pref?.value;

      if (options == null || options.summary_level == null) {
        options = options || new DashboardEarningsOptions();
        options.summary_level = options.summary_level || StatSummaryLevel.week;
        await this._prefSvc.updatePreferenceValue(PreferenceType.DashboardEarnings, this._options, false)
      }

      if (!this._options || this._options.summary_level != options.summary_level) {
        this._options = options;
        await this.refreshData();
      }
    });

    setInterval(async () => this.refreshData(false), this._refreshIntervalSeconds * 1000);
  }

  ngOnInit() { }

  public async onLevelChange(event: any) {
    this._logger.LogDebug("onLevelChange", event);

    this._options.summary_level = event.detail.value;

    await this.refreshData();

    await this._prefSvc.updatePreferenceValue(PreferenceType.DashboardEarnings, this._options, true)
  }

  private async refreshData(showLoading: boolean = true) {

    if(!this.currentUser){
      return;
    }

    this._logger.LogDebug("refreshData", this._options?.summary_level, this.level);

    this.level = this._options?.summary_level || StatSummaryLevel.week;

    this.currentWindow = this._statsSvc.getStatsWindowForDate(new Date(), this.level);

    //When refreshing sometimes we don't want to show the "one moment please"
    if (showLoading){
      this.isLoading = true;
    }

    try {
      const stats = await this._statsSvc.getLatestPerformanceStats(this.level);

      this._logger.LogDebug("stats", stats);

      if (stats?.window?.startRange && this.level != StatSummaryLevel.year) {
        const goalMes = await this._goalSvc.getPerformance(this.level, stats.window.startRange);

        this.goal = goalMes?.find(x => x.type == 'earnings')

        if (this.goal) {
          this._performanceChart = this._goalSvc.updatePerformanceDonutChart(this.goal, this._performanceCanvas, this._performanceChart);
        } else {

        }
      } else {
        this.goal = null;
      }

      this.stats = stats;
      this.hasNoData = !stats.hasActivity;
    }
    finally {
      this.isLoading = false;
    }
  }

  public get levelAdjective():string{
    return this.levels.find(l => l.level == this.level)?.display;
  }
  
  public async onSetGoalClick(){

    const goal = new Goal();
    goal.type= "earnings";
    goal.frequency = this.level;
    goal.start_date_unix = getUnixTime(this.stats.window.startRange);
    
    await this._modalSvc.open("goal_edit",{
      component: GoalEditComponent,
      componentProps: {
        goal: goal,
        isNew: true
      }});
  }

  public async onLinkAccountsClick(){
    await this._gigAcctSvc.manageGigAccountLinks();
  }

  public async onPerformanceClick(){
    this._statsSvc.setStatsWindow(this.stats.window);
    await this._browserNavSvc.requestNavigation(false, false, false, "home/earnings");
  }

}
