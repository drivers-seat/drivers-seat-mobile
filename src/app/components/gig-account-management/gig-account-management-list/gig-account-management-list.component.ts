import { Component, OnInit } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { ArgyleGigAccount } from 'src/app/models/Argyle';
import { ApiService } from 'src/app/services/api.service';
import { IGigAccountManagementService } from 'src/app/services/gig-account-management/gig-account-management.service';
import { IGigPlatformService } from 'src/app/services/gig-platform/gig-platform.service';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import { IUserSupportService } from 'src/app/services/user-support/user-support.service';

@Component({
  selector: 'gig-account-management-list',
  templateUrl: './gig-account-management-list.component.html',
  styleUrls: [
    '../gig-account-management.scss',
    './gig-account-management-list.component.scss'
  ],
})
export class GigAccountManagementListComponent implements OnInit {

  private readonly _logger: Logger;

  public linkedAccounts: Array<ArgyleGigAccount>;
  public isReady: boolean = false;
  public get isGhosting():boolean{
    return this._apiSvc.isGhosting;
  }

  constructor(
    logSvc:ILogService,
    private readonly _apiSvc: ApiService,
    private readonly _gigPlatformSvc: IGigPlatformService,
    private readonly _gigAccountMgmtSvc: IGigAccountManagementService,
    private readonly _alertCtrl: AlertController,
    private readonly _userSupportSvc: IUserSupportService
  ) { 

    this._logger = logSvc.getLogger("GigAccountManagementListComponent");
    
    this._gigAccountMgmtSvc.linkedAccounts$.subscribe(linkedAccounts=>{
      this.linkedAccounts = linkedAccounts;
    });

    this._gigAccountMgmtSvc.isReady$.subscribe(isReady => {
      this.isReady = isReady;
    })
  }

  public getEmployerColorBackground(name:string): string {

    return name == null || name.trim() == ""
      ? "white"
      : this._gigPlatformSvc.getEmployerColorLight(name) || "gray";
  }

  public getEmployerColorBorder(name: string): string {

    return name == null || name.trim() == ""
      ? "gray"
      : this._gigPlatformSvc.getEmployerColorDark(name) || "gray";
  }

  public getEmployerName(name: string): string {

    return this._gigPlatformSvc.getEmployerInfo(name)?.name || name;
  }

  public async requestDeleteAccount(acct:ArgyleGigAccount){

    if(this._apiSvc.isGhosting){
      this._logger.LogInfo("requestDeleteAccount", "Ignoring Request while ghosting");
    }

    const name = this._gigPlatformSvc.getEmployerInfo(acct.link_item)?.name || acct.link_item;
    
    await this._alertCtrl.create({
      header: `Disconnect ${name}?`,
      message: `Are you sure you want to disconnect ${name}?`,
      cssClass: "pop-up",
      buttons: [
        {
          text: "Yes",
          role: "delete",
          handler: (async x=>{
            await this._gigAccountMgmtSvc.deleteGigAccountLink(acct);
          })
        }, 
        {
          text: "No",
          role: "cancel"
        }
      ]
    })
    .then(x=>x.present());
  }

  public async manageGigAccounts(account: ArgyleGigAccount = null) {
    await this._gigAccountMgmtSvc.manageGigAccountLinks(account);
  }

  public async onLinkAccountHelpClick(){

    if(this._apiSvc.isGhosting){
      this._logger.LogInfo("onLinkAccountHelpClick", "Ignoring Request while ghosting");
    }
    
    this._userSupportSvc.composeMessage("Gig Account Linking", "Help! I'm not able to connect to my gig account.");
  }

  ngOnInit() {}
}
