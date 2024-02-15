import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IGigAccountManagementService } from 'src/app/services/gig-account-management/gig-account-management.service';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';

@Component({
  selector: 'stats-waiting-for-data',
  templateUrl: './stats-waiting-for-data.component.html',
  styleUrls: [
    '../stats.scss',
    './stats-waiting-for-data.component.scss'],
})
export class StatsWaitingForDataComponent implements OnInit {

  private readonly _logger: Logger;

  constructor(
    logSvc: ILogService,
    private readonly _router: Router,
    private readonly _gigActMgmtSvc: IGigAccountManagementService
  ) { 
    this._logger = logSvc.getLogger("StatsWaitingForDataComponent");
  }

  ngOnInit(): void {
  }

  public async onGigAccountsClick(){
    await this._router.navigateByUrl('gig-accounts');
  }

  public async onCompleteProfileClick(){
    await this._router.navigateByUrl('profile');
  }

  public async onShiftRemindersClick(){
    await this._router.navigateByUrl('work-settings');
  }

  public async onAddExpenseClick(){
    await this._router.navigateByUrl('expenses/list');
  }
}
