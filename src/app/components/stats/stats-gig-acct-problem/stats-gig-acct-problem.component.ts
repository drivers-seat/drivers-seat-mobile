import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TextHelper } from 'src/app/helpers/TextHelper';
import { ArgyleGigAccount } from 'src/app/models/Argyle';
import { IGigAccountManagementService } from 'src/app/services/gig-account-management/gig-account-management.service';
import { IGigPlatformService } from 'src/app/services/gig-platform/gig-platform.service';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';

@Component({
  selector: 'stats-gig-acct-problem',
  templateUrl: './stats-gig-acct-problem.component.html',
  styleUrls: [
    '../stats.scss',
    './stats-gig-acct-problem.component.scss'
  ],
})
export class StatsGigAcctProblemComponent implements OnInit {

  private readonly _logger: Logger;
  public message_text:string;

  public problemAccounts
  constructor(
    logSvc: ILogService,
    private readonly _gigAcctMgmtSvc: IGigAccountManagementService,
    private readonly _gigPlatformSvc: IGigPlatformService,
    private readonly _router: Router
  ) {
    this._logger = logSvc.getLogger("StatsGigAcctProblemComponent");

    this._gigAcctMgmtSvc.linkedAccounts$.subscribe(x=>{

      const account_names = this._gigAcctMgmtSvc.gigAccountsWithIssues?.map(x=>{
          return this._gigPlatformSvc.getEmployerInfo(x.link_item)?.name || x.link_item?.replace("_"," ")
        }).sort();

        this.message_text = `We're having trouble connecting to your ${TextHelper.toFriendlyCsv("and", account_names)} ${account_names.length > 1 ? 'accounts' : 'account'}.`;
    });
  }

  ngOnInit() { }

  public onManageClick(){
    this._router.navigateByUrl("gig-accounts");
  }



}
