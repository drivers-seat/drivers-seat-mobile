import { Component, OnInit } from '@angular/core';
import { fromUnixTime } from 'date-fns';
import { TimeHelper } from 'src/app/helpers/TimeHelper';
import { Activity } from 'src/app/models/Activity';
import { Timespan } from 'src/app/models/Timespan';
import { TimespanAllocation } from 'src/app/models/TimespanAllocation';
import { IEarningsService } from 'src/app/services/earnings/earnings.service';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import { IModalService } from 'src/app/services/modal/modal.service';
import { StatsService } from 'src/app/services/stats/stats.service';
import { IUserSupportService } from 'src/app/services/user-support/user-support.service';

@Component({
  selector: 'ctivity-detail',
  templateUrl: './activity-detail.component.html',
  styleUrls: [
    '../stats.scss',
    './activity-detail.component.scss'
  ],
})
export class ActivityDetailComponent implements OnInit {

  private readonly _logger: Logger;
  public TimeHelper: TimeHelper = TimeHelper.Instance;

  public activity_id: number;
  
  public activity: Activity;
  public timespan: Timespan;
  public timespan_alloc: TimespanAllocation;
å
  constructor(
    logSvc: ILogService,
    private readonly _earningsSvc: IEarningsService,
    private readonly _modalvc: IModalService,
    private readonly _userSupporSvc: IUserSupportService
  ) {
    this._logger = logSvc.getLogger("ActivityDetailComponent")
  }

  public async ionViewDidEnter() {

    this.activity = null;
    if(this.activity_id){
      const activityResult = await this._earningsSvc.get_activity(this.activity_id);
      if(activityResult.activity_id == this.activity_id){
        this.activity = activityResult.activity;
      }
    }
  }

  ngOnInit() { }

  public onHelpActivity(){

    const timestamp = this.activity.timestamp_work_start_unix || this.activity.timestamp_work_end_unix;
    const timestampStr = timestamp != null
      ? fromUnixTime(timestamp).toISOString()
      : "";

    this._userSupporSvc.composeMessage("Gig Activity/Job", `Something's wrong with my ${this.activity.employer} activity.  Activity: ${this.activity.activity_id} : ${this.activity.activity_key} : ${timestampStr}`);
  }

  public onCancel() {
    this._modalvc.dismiss();
  }
}
