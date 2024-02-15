import { Component, OnInit } from '@angular/core';
import { ArgyleGigAccount } from 'src/app/models/Argyle';
import { ApiService } from 'src/app/services/api.service';
import { IBrowserNavigationService } from 'src/app/services/browser-navigation/browser-navigation.service';
import { IGigAccountManagementService } from 'src/app/services/gig-account-management/gig-account-management.service';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';

@Component({
  selector: 'gig-account-management',
  templateUrl: './gig-account-management.component.html',
  styleUrls: [
    '../gig-account-management.scss',
    './gig-account-management.component.scss'
  ]
})
export class GigAccountManagementComponent implements OnInit {

  private readonly _logger: Logger;

  public isReady: boolean;
  public isRegistered: boolean;
  public linkedAccounts: Array<ArgyleGigAccount>;
  public showLegend: boolean = false;

  public get isGhosting():boolean{
    return this._apiSvc.isGhosting;
  }

  constructor(
    logSvc:ILogService,
    private readonly _gigAccountMgmtSvc: IGigAccountManagementService,
    private readonly _browserNavSvc: IBrowserNavigationService,
    private readonly _apiSvc: ApiService
  ) {
    this._logger = logSvc.getLogger("GigAccountManagementComponent");

    this._gigAccountMgmtSvc.isReady$.subscribe(ready=>{
      this.isReady = ready;
    });

    this._gigAccountMgmtSvc.isRegistered$.subscribe(isRegistered=>{
      this.isRegistered = isRegistered;
    });

    this._gigAccountMgmtSvc.linkedAccounts$.subscribe(linkedAccounts=>{
      this.linkedAccounts = linkedAccounts;
    });
   }

  ngOnInit() {}

  public async manageGigAccounts(){
    await this._gigAccountMgmtSvc.manageGigAccountLinks();
  }

  public async cancelClick(){
    this._browserNavSvc.navigateBack();
  }

  public toggleLegend(){
    this.showLegend = !this.showLegend;
  }

}
