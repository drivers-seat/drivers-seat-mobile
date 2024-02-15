import { Component, OnInit } from '@angular/core';
import { startOfDay } from 'date-fns';
import { KnowledgeBaseArticle } from 'src/app/models/KnowledgeBaseArticle';
import { StatSummaryLevel, StatsWindow } from 'src/app/models/PerformanceStatistic';
import { User } from 'src/app/models/User';
import { ApiService } from 'src/app/services/api.service';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import { StatsService } from 'src/app/services/stats/stats.service';
import { IUserSupportService } from 'src/app/services/user-support/user-support.service';
import { UserService } from 'src/app/services/user.service';
import { ExportRequestComponent } from '../export-request/export-request.component';
import { IModalService } from 'src/app/services/modal/modal.service';

@Component({
  selector: 'stats-navigation',
  templateUrl: './stats-navigation.component.html',
  styleUrls: [
    '../../../driversseat-styles.scss',
    './stats-navigation.component.scss'
  ],
})
export class StatsNavigationComponent implements OnInit {

  private readonly _logger: Logger;

  private _currentUser: User;

  window: StatsWindow;
  summaryLevel: StatSummaryLevel;

  canMoveNext: boolean;
  canMovePrev: boolean;
  canMoveNow: boolean;
  moveNowLabel: string;
  windowTitle: string;

  canExport: boolean;

  summaryLevels: StatSummaryLevel[] = [
    StatSummaryLevel.day,
    StatSummaryLevel.week,
    StatSummaryLevel.month,
    StatSummaryLevel.year
  ];
  
  constructor(
    logSvc: ILogService,
    private readonly _apiSvc: ApiService,
    private readonly _userSvc: UserService,
    private readonly _statsSvc: StatsService,
    private readonly _userSupportSvc: IUserSupportService,
    private readonly _modalSvc: IModalService
  ) { 

    this._logger = logSvc.getLogger("StatsNavigationComponent");
    this._userSvc.currentUser$.subscribe(u=>this._currentUser = u)
    
    this._statsSvc.selectedStatsWindow$.subscribe(w=>{
      this.setWindow(w,w.summaryLevel, false);
    });
  }

  windowMovePrev() {
    if(!this.canMovePrev){
      return;
    }

    let window = this._statsSvc.getStatsWindowPrev(this.window);
    this.setWindow(window, this.summaryLevel);
  }

  windowMoveNext() {
    if(!this.canMoveNext){
      return;
    }

    let window = this._statsSvc.getStatsWindowNext(this.window);
    this.setWindow(window, this.summaryLevel);
  }

  windowMoveNow() {
    let window = this._statsSvc.getStatsWindowForDate(new Date(), this.summaryLevel);
    this.setWindow(window, this.summaryLevel);
  }


  toggleSummaryLevel(event: any) {

    let level = StatSummaryLevel[event.detail.value];
    this.selectSummaryLevel(level);
  }

  selectSummaryLevel(level: StatSummaryLevel){
    
    let window = this.window;

    switch(level){
      case StatSummaryLevel.day:
        window = this._statsSvc.getStatsWindowForDate(this.window.startRange, level);
        break;

      case StatSummaryLevel.week:
        window = this.summaryLevel == StatSummaryLevel.day
          ? this._statsSvc.getStatsWindowForDate(this.window.endRange, level)
          : this._statsSvc.getStatsWindowForDate(this.window.startRange, level);
        break;

      case StatSummaryLevel.month:
        window = this._statsSvc.getStatsWindowForDate(this.window.endRange, level);
        break;

      case StatSummaryLevel.year:
        window = this._statsSvc.getStatsWindowForDate(this.window.startRange, level);
        break
    }

    const now =  new Date();
    if(window.startRange > now){
      window = this._statsSvc.getStatsWindowForDate(now, window.summaryLevel);
    }

    this.setWindow(window, level);
  }

  setWindow(window: StatsWindow, summaryLevel: StatSummaryLevel, emitChanges: boolean = true) {

    let now = startOfDay(new Date());
    this.window = window;
    this.summaryLevel = summaryLevel;

    this.canExport = false;
    if(this._currentUser && this.window && !this._apiSvc.isGhosting){
      this._statsSvc.getPerformanceStats(this._currentUser.id, this.window)
        .then(stat=>{
          this.canExport = !stat.hasNoJobs;
        });
    }

    this.canMovePrev = true;
    this.canMoveNext = window.endRange < now;

    this.canMoveNow = now < this.window.startRange || now > this.window.endRange;

    switch (this.summaryLevel) {
      case StatSummaryLevel.day:
        this.moveNowLabel = "show today";
        this.windowTitle = this.window.title;
        break;

      case StatSummaryLevel.week:
        this.moveNowLabel = "show this " + this.summaryLevel;
        this.windowTitle = "Week of " + window.title;
        break;

      case StatSummaryLevel.month:
      default:
        this.moveNowLabel = "show this " + this.summaryLevel;
        this.windowTitle = this.window.title;
        break;
    }

    if (emitChanges) {
      this._statsSvc.setStatsWindow(this.window);
    }
  }

  public async requestDownload(){

    if(!this.canExport){
      return;
    }

    await this._modalSvc.open(`home/earnings/${this.window.summaryLevel}/download`, {
      component: ExportRequestComponent,
      componentProps: {
        window: this.window
      }
    }, this.window);
  }

  public async showHelp() {
    await this._userSupportSvc.openKnowledgeBaseArticle(KnowledgeBaseArticle.DashboardStats);
  }

  ngOnInit() {
    this.setWindow(this.window, this.summaryLevel, false);
  }
}
