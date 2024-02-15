import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { getUnixTime } from 'date-fns';
import { KnowledgeBaseArticle } from 'src/app/models/KnowledgeBaseArticle';
import { StatsCompareModel } from 'src/app/models/PerformanceStatistic';
import { ILogService } from 'src/app/services/logging/log.service';
import { IModalService } from 'src/app/services/modal/modal.service';
import { UserSupportService } from 'src/app/services/user-support/user-support.service';

@Component({
  selector: 'stats-view-summary',
  templateUrl: './stats-view-summary.component.html',
  styleUrls: [
    '../../../driversseat-styles.scss',
    './stats-view-summary.component.scss'
  ],
})
export class StatsViewSummaryComponent implements OnInit {

  private _summaryStats: StatsCompareModel;

  public noData_ShowMore: boolean;

  @Input()
  public get summaryStats(): StatsCompareModel {
    return this._summaryStats;
  }

  public set summaryStats(value: StatsCompareModel) {
    if (value == this._summaryStats) {
      return;
    }

    this._summaryStats = value;
    this.noData_ShowMore = false;
  }

  constructor(
    logSvc: ILogService,
    private readonly _userSupportSvc: UserSupportService,
    private readonly _router: Router
  ) {

    logSvc.getLogger("StatsViewSummaryComponent");
  }

  ngOnInit() { }

  public async showHelp() {
    await this._userSupportSvc.openKnowledgeBaseArticle(KnowledgeBaseArticle.DashboardStats);
  }

  public toggleNoDataShowMore() {
    this.noData_ShowMore = !this.noData_ShowMore;
  }

  public goto_Profile() {
    this._router.navigateByUrl('gig-accounts');
  }

  public async goto_Expenses(autoAddNew: boolean = false) {

    if(!this.summaryStats?.current?.window){
      return;
    }

    const startUnix = getUnixTime(this.summaryStats.current.window.startRange);
    await this._router.navigateByUrl(`/expenses/list?start=${startUnix}&level=${this.summaryStats.current.window.summaryLevel}&addNew=${autoAddNew}`);
  }
}
