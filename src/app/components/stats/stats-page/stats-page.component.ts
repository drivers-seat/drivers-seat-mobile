import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { ArgyleGigAccount } from 'src/app/models/Argyle';
import { StatSummaryLevel, StatsWindow } from 'src/app/models/PerformanceStatistic';
import { User } from 'src/app/models/User';
import { IDeviceService } from 'src/app/services/device/device.service';
import { IGigAccountManagementService } from 'src/app/services/gig-account-management/gig-account-management.service';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import { StatsService } from 'src/app/services/stats/stats.service';
import { UserService } from 'src/app/services/user.service';

@Component({
  selector: 'stats-page',
  templateUrl: './stats-page.component.html',
  styleUrls: [
    '../../../driversseat-styles.scss',
    '../stats.scss',
    './stats-page.component.scss'

  ],
})
export class StatsPageComponent implements OnInit {

  private readonly _logger: Logger;

  private _currentUser: User;

  private _userHasAnyEarningsData: boolean;
  private _isRegisteredGigAcctSvc: boolean;
  private _gigAccountsConnected: Array<ArgyleGigAccount>;
  private _gigAccountsError: Array<ArgyleGigAccount>;
  private _gigAccountsSynced: Array<ArgyleGigAccount>;

  public get hasAccountsWithErrors(): boolean {

    if (this._currentUser?.is_demo_account) {
      return false;
    }

    return this._gigAccountsError?.length > 0;
  }

  public get isRegistered(): boolean {
    return this._currentUser?.is_demo_account || (this._isRegisteredGigAcctSvc && this._gigAccountsConnected?.length > 0);
  }

  public get hasData(): boolean {
    return this.isRegistered && this._userHasAnyEarningsData;
  }

  public get summaryLevel(): StatSummaryLevel{
    return this.window?.summaryLevel;
  }

  public get window(): StatsWindow{
    return this._statsSvc.selectedStatsWindow$.value;
  }

  summaryLevels: StatSummaryLevel[] = [
    StatSummaryLevel.day,
    StatSummaryLevel.week,
    StatSummaryLevel.month
  ];

  constructor(
    logSvc: ILogService,
    private readonly _deviceSvc: IDeviceService,
    private readonly _userSvc: UserService,
    private readonly _gigAcctMgmtSvc: IGigAccountManagementService,
    private readonly _statsSvc: StatsService
  ) {
    this._logger = logSvc.getLogger("StatsPageComponent");

    this._userSvc.currentUser$.subscribe(async user => {
      const oldUser = this._currentUser;
      this._currentUser = user;
      if (oldUser?.id == this._currentUser?.id) {
        return;
      }

      await this.checkCurrentUserHasAnyData();
    })

    this._gigAcctMgmtSvc.isRegistered$.subscribe(async isSubscribed => {
      this._isRegisteredGigAcctSvc = isSubscribed;
      await this.updateUI();
    });

    this._gigAcctMgmtSvc.linkedAccounts$.subscribe(async gigAccts => await this.onLinkedAccountsChange(gigAccts));
  }

  private async onLinkedAccountsChange(gigAccts: Array<ArgyleGigAccount>) {
    this._gigAccountsConnected = gigAccts?.filter(x => x.is_connected) || [];
    this._gigAccountsSynced = gigAccts?.filter(x => x.is_synced) || [];
    this._gigAccountsError = gigAccts?.filter(x => x.has_errors) || [];

    await this.updateUI();
  }

  private async checkCurrentUserHasAnyData() {
    this._userHasAnyEarningsData = this._currentUser
      ? await this._statsSvc.getUserHasAnyData(this._currentUser)
      : false;

    await this.updateUI();
  }

  public async ionViewWillEnter() {
    this._logger.LogDebug("ionViewWillEnter");

    this.checkCurrentUserHasAnyData();
  }

  public async ionViewWillLeave() {
    this._logger.LogDebug("ionViewWillLeave");

    if (!this._deviceSvc.is_Web) {
      StatusBar.setStyle({
        style: Style.Light
      });
    }
  }

  ngOnInit() {
  }

  private async updateUI() {

    if (this._deviceSvc.is_Web) {
      return;
    }

    if (!this.hasData || !this.isRegistered) {
      this._logger.LogDebug("updateUI", "setting to Dark", this.hasData, this.isRegistered);
      await StatusBar.setStyle({
        style: Style.Dark
      });
      return;
    }

    this._logger.LogDebug("updateUI", "setting to Light", this.hasData, this.isRegistered);
    await StatusBar.setStyle({
      style: Style.Light
    });
  }
}
