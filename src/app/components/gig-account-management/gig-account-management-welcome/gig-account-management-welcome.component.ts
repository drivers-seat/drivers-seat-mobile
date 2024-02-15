import { Component, OnInit } from '@angular/core';
import { Browser } from '@capacitor/browser';
import { IBrowserNavigationService } from 'src/app/services/browser-navigation/browser-navigation.service';
import { IGigAccountManagementService } from 'src/app/services/gig-account-management/gig-account-management.service';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import { ArgyleHowUseDataComponent } from '../argyle-how-use-data/argyle-how-use-data.component';
import { IModalService } from 'src/app/services/modal/modal.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'gig-account-management-welcome',
  templateUrl: './gig-account-management-welcome.component.html',
  styleUrls: [
    '../gig-account-management.scss',
    './gig-account-management-welcome.component.scss'
  ]
})
export class GigAccountManagementWelcomeComponent implements OnInit {

  private readonly _logger: Logger;

  public get appDisplayName(): string { return environment.appDisplayName; }

  constructor(
    logSvc: ILogService,
    private readonly _gigAcctMgmtSvc: IGigAccountManagementService,
    private readonly _browserNavSvc: IBrowserNavigationService,
    private readonly _modalSvc: IModalService
  ) {
    this._logger = logSvc.getLogger("GigAccountManagementListComponent");
  }

  ngOnInit() { }

  public getStartedClick() {
    this._gigAcctMgmtSvc.manageGigAccountLinks();
  }

  public cancelClick() {
    this._browserNavSvc.navigateBack();
  }

  public async launchArgyleTOS() {
    this.openInAppBrowser("Argyle Terms of Service", 'https://argyle.com/legal/consumers/end-user-terms');
  }
  
  private openInAppBrowser(title: string, url: string) {
    Browser.open({
      url: url,
      windowName: title,
      presentationStyle: 'fullscreen',
      toolbarColor: "d7d9f9",
    });
  }

  public async launchArgyleDataQ() {
    await this._modalSvc.open("gig-accounts/argyle-description", {
      component: ArgyleHowUseDataComponent,
    });
  }
}
