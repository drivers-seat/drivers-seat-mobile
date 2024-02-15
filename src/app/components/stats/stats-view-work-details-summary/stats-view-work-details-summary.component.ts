import { Component, Input, OnInit } from '@angular/core';
import { format, fromUnixTime, getUnixTime } from 'date-fns';
import { TimeHelper } from 'src/app/helpers/TimeHelper';
import { KnowledgeBaseArticle } from 'src/app/models/KnowledgeBaseArticle';
import { StatSummaryLevel, StatsWindow } from 'src/app/models/PerformanceStatistic';
import { WorkTimeAndEarningsSummary } from "src/app/models/WorkTimeAndEarningsSummary";
import { IEarningsService } from 'src/app/services/earnings/earnings.service';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import { StatsService } from 'src/app/services/stats/stats.service';
import { IUserSupportService } from 'src/app/services/user-support/user-support.service';

@Component({
  selector: 'stats-view-work-details-summary',
  templateUrl: './stats-view-work-details-summary.component.html',
  styleUrls: [
    '../stats.scss',
    './stats-view-work-details-summary.component.scss'
  ],
})
export class StatsViewWorkDetailsSummaryComponent implements OnInit {

  private readonly _logger: Logger;
  public childSummaryLevel: StatSummaryLevel;
  public showPrecise: boolean;

  public TimeHelper: TimeHelper = TimeHelper.Instance;

  public summaryStat: WorkTimeAndEarningsSummary;
  public childStats: WorkTimeAndEarningsSummary[];

  public window: StatsWindow;
  
  constructor(
    logSvc: ILogService,
    private readonly _earningsSvc: IEarningsService,
    private readonly _statsSvc: StatsService
  ) {
    this._logger = logSvc.getLogger("StatsViewWorkDetailsSummaryComponent");

    this._statsSvc.statsChanged$.subscribe(async x=>{
      this._logger.LogDebug("StatsChanged",x);
      await this.refreshStats();
    })

    this._statsSvc.selectedStatsWindow$.subscribe(async w => {
      const oldValue = this.window;
      this.window = w;

      if (this.window?.key != oldValue?.key) {
        this.childSummaryLevel = this._statsSvc.getChildSummaryLevel(this.window.summaryLevel);
        await this.refreshStats()
      }
    });
  }

  ngOnInit() { }

  private async refreshStats() {

    this.summaryStat = null;
    this.childStats = null;

    if (this.window) {
      this.showPrecise = this.window.summaryLevel == StatSummaryLevel.day;
      const summaryStatPromise = this._earningsSvc.get_work_time_and_earnings_summary(this.window); 
      const childStatsPromise = this._earningsSvc.get_work_time_and_earnings_summary_breakdown(this.window); 

      await Promise.all([summaryStatPromise, childStatsPromise]);

      const summaryStatResult = await summaryStatPromise;
      const childStatsResult = await childStatsPromise;

      if(summaryStatResult.window == this.window && childStatsResult.window == this.window){
        
        this.summaryStat =summaryStatResult.summary;
        this.childStats = childStatsResult.summaries.sort((a, b) => getUnixTime(a.window.startRange) - getUnixTime(b.window.endRange));
      }
    }
  }

  public onDrillDown(toWindow: StatsWindow) {
    this._logger.LogDebug("onDrillDown", toWindow)
    this._statsSvc.setStatsWindow(toWindow);
  }
}
