import { Component, OnInit } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { StatSummaryLevel, StatsWindow } from 'src/app/models/PerformanceStatistic';
import { User } from 'src/app/models/User';
import { IEarningsService } from 'src/app/services/earnings/earnings.service';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import { IModalService } from 'src/app/services/modal/modal.service';
import { UserService } from 'src/app/services/user.service';

@Component({
  selector: 'stats-export-request',
  templateUrl: './export-request.component.html',
  styleUrls: [
    '../stats.scss',
    './export-request.component.scss'
  ],
})
export class ExportRequestComponent implements OnInit {

  private readonly _logger: Logger;

  private _currentUser: User;

  public window: StatsWindow;
  public start_date: Date;
  public end_date: Date;
  public group_by_employer: boolean;
  public include_unpaid_mileage: boolean;
  public group_by_time: boolean;
  public time_grouping: 'quarter' | 'month' | 'week' | 'day';

  public get canSummarizeByWeek(): boolean {
    return this.window?.summaryLevel == StatSummaryLevel.month || this.window?.summaryLevel == StatSummaryLevel.year;
  }

  public get canSummarizeByMonth(): boolean {
    return this.window?.summaryLevel == StatSummaryLevel.year;
  }

  public get canSummarizeByQuarter(): boolean {
    return this.window?.summaryLevel == StatSummaryLevel.year;
  }

  public get canSummarizeByDay(): boolean {
    return this.window?.summaryLevel != StatSummaryLevel.day;
  }

  constructor(
    logSvc: ILogService,
    private readonly _earningsSvc: IEarningsService,
    private readonly _modalSvc: IModalService,
    private readonly _toastCtrl: ToastController,
    private readonly _userSvc: UserService
  ) {
    this._logger = logSvc.getLogger("ExportRequestComponent");

    this._userSvc.currentUser$.subscribe(u => {
      this._currentUser = u;
    })
  }

  public ngOnInit() { }

  public ionViewDidEnter() {
    this._logger.LogDebug("ionViewDidEnter", this.window);

  }

  public async onCancelClick() {
    await this._modalSvc.dismiss();
  }

  public async onExportClick() {

    const groupings: Array<'quarter' | 'month' | 'week' | 'day' | 'employer'> = [];

    if (this.group_by_employer) {
      groupings.push('employer');
    }

    if (this.group_by_time && this.time_grouping) {
      groupings.push(this.time_grouping);
    }



    if (groupings.length > 0) {
      await this._earningsSvc.export(this.window, this.include_unpaid_mileage, groupings);
    } else {
      await this._earningsSvc.export(this.window, this.include_unpaid_mileage, null);
    }

    await this._toastCtrl.create({
      header: "Earnings and Mileage Export",
      message: `Your request has been submitted.  When it's done, we'll send an email to ${this._currentUser?.email}.`,
      position: 'bottom',
      duration: 5000,
      cssClass: "pop-up",   //in global.scss
    }).then(t => t.present());

    await this.onCancelClick();
  }

  public toggle_group_by_employer() {
    this.group_by_employer = !this.group_by_employer;
  }

  public toggle_include_unpaid_mileage() {
    this.include_unpaid_mileage = !this.include_unpaid_mileage;
  }

  public toggle_enable_time_grouping() {
    this.group_by_time = !this.group_by_time;

    if (!this.group_by_time){
      this.time_grouping = null;
      return;
    }

    switch (this.window?.summaryLevel) {
      case StatSummaryLevel.day:
        this.time_grouping = 'day';
        break;

      case StatSummaryLevel.week:
        this.time_grouping = 'day'
        break;

      case StatSummaryLevel.month:
        this.time_grouping = 'week';
        break;

      case StatSummaryLevel.year:
        this.time_grouping = 'quarter';
        break;
    }
  }

  public setTimeGrouping(grouping: 'quarter' | 'month' | 'week' | 'day') {
    this.time_grouping = grouping;
  }
}
