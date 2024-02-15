import { Component, Input, OnInit } from '@angular/core';
import { TimeHelper } from 'src/app/helpers/TimeHelper';
import { Activity } from 'src/app/models/Activity';
import { StatsWindow } from 'src/app/models/PerformanceStatistic';
import { Timespan } from 'src/app/models/Timespan';
import { TimespanAllocation } from 'src/app/models/TimespanAllocation';
import { IEarningsService } from 'src/app/services/earnings/earnings.service';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import { StatsService } from 'src/app/services/stats/stats.service';
import { ActivityDetailComponent } from '../activity-detail/activity-detail.component';
import { IModalService } from 'src/app/services/modal/modal.service';

@Component({
  selector: 'stats-view-work-details-workday',
  templateUrl: './stats-view-work-details-workday.component.html',
  styleUrls: [
    '../stats.scss',
    './stats-view-work-details-workday.component.scss'
  ],
})
export class StatsViewWorkDetailsWorkdayComponent implements OnInit {

  private readonly _minNonEngagedDurationSeconds = 300;

  private readonly _logger: Logger;

  public TimeHelper: TimeHelper = TimeHelper.Instance;

  public timespans: Timespan[];

  public other_activities: Activity[];

  public window: StatsWindow;

  constructor(
    logSvc: ILogService,
    private readonly _earningsSvc: IEarningsService,
    private readonly _statsSvc: StatsService,
    private readonly _modalSvc: IModalService
  ) {
    this._logger = logSvc.getLogger("StatsViewWorkDetailsWorkdayComponent");

    this._statsSvc.statsChanged$.subscribe(async x => {
      this._logger.LogDebug("StatsChanged", x);
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

  ngOnInit() { }

  private async refreshStats() {

    this.timespans = null;
    this.other_activities = null;

    if (this.window) {

      const timespansPromise = this._earningsSvc.get_timespans_for_workday(this.window.startRange);
      const activitiesPromise = this._earningsSvc.get_activities_for_workday(this.window.startRange);

      await Promise.all([timespansPromise, activitiesPromise]);

      const timespans_result = await timespansPromise;
      const activities_result = await activitiesPromise;

      if(timespans_result.work_date == this.window.startRange && activities_result.work_date == this.window.startRange){
        this.timespans = timespans_result.timespans.sort((a, b) => a.start_time_unix - a.start_time_unix);

        const work_activity_ids = this.timespans
          .flatMap(ts => ts.allocations)
          .filter(a => a.activity_id)
          .map(a => a.activity_id);

        //obtain activities not associated with work time
        this.other_activities = activities_result.activities
          .filter(a => (a.earnings_total || 0) != 0)
          .filter(a => !work_activity_ids.includes(a.activity_id))
          .sort((a, b) => a.employer.localeCompare(b.employer));
      }
    }
  }

  public getActiveAllocations(timespan: Timespan): TimespanAllocation[] {

    if (timespan.allocations.length == 1) {
      return timespan.allocations
    }

    return timespan.allocations
      .filter(a => a.activity_id || a.duration_seconds > this._minNonEngagedDurationSeconds)
      .sort((a, b) => a.start_time_unix - b.start_time_unix);
  }

  public getTimespanIsMileageTracked(timespan: Timespan): boolean {
    return timespan.selected_miles != null;
  }

  public async onAllocClick(timespan: Timespan, alloc: TimespanAllocation) {

    const name = `home/earnings/${this.window.summaryLevel}/activities/jobDetail`;

    await this._modalSvc.open(name, {
      showBackdrop: false,
      component: ActivityDetailComponent,
      componentProps: {
        activity_id: alloc.activity_id,
        timespan: timespan,
        timespan_alloc: alloc
      }
    }, alloc);
  }

  public async onActivityClick(activity: Activity) {

    const name = `home/earnings/${this.window.summaryLevel}/activities/paymentDetail`;

    await this._modalSvc.open(name, {
      showBackdrop: false,
      component: ActivityDetailComponent,
      componentProps: {
        activity_id: activity.activity_id,
      }
    }, activity);
  }
}
