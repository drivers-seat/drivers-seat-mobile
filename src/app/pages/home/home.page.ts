import { Component, ViewChild } from '@angular/core';
import { IonTabs, MenuController } from '@ionic/angular';
import { IGigAccountManagementService } from 'src/app/services/gig-account-management/gig-account-management.service';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import { IPreferenceService } from 'src/app/services/preferences/preferences.service';
import { IUserSupportService } from 'src/app/services/user-support/user-support.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: [
    '../../driversseat-styles.scss',
    'home.page.scss'],
})
export class HomePage {

  @ViewChild('tabs', { static: false }) tabs: IonTabs;

  public selectedTab: string;

  public get countGigAccountIssues(): number {
    return this._gigAcctMgmtSvc.countGigAccountIssues;
  }

  public get isLocationTrackingEnabled():boolean {
    return environment.backgroundGeolocation?.available;
  }

  private readonly _logger: Logger;
  private _currentVersionInstallDate: Date = null;

  constructor(
    logSvc: ILogService,
    private readonly _menuController: MenuController,
    private readonly _prefSvc: IPreferenceService,
    private readonly _gigAcctMgmtSvc: IGigAccountManagementService
  ) {

    this._logger = logSvc.getLogger("HomePage");

    this._prefSvc.currentVersionFirstUsageDate$.subscribe(dtm => {
      this._logger.LogInfo("Current Install Date Changee", dtm)
      this._currentVersionInstallDate = dtm;
    });
  }

  setCurrentTab() {
    this.selectedTab = this.tabs.getSelected();
  }

  public async menu_click() {
    this._logger.LogDebug("menu_click");
    await this._menuController.enable(true, 'shiftOnRightMenuContentId')
      .then(() => this._menuController.open('shiftOnRightMenuContentId'));
  }
}
