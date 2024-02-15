import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IGigAccountManagementService } from 'src/app/services/gig-account-management/gig-account-management.service';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';

@Component({
  selector: 'stats-welcome',
  templateUrl: './stats-welcome.component.html',
  styleUrls: [
    '../stats.scss',
    './stats-welcome.component.scss'
  ],
})
export class StatsWelcomeComponent implements OnInit {

  private readonly _logger: Logger;

  public readonly slideOpts = {
    autoplay: {
      delay: 3000,
    },
    loop: true
  }

  constructor(
    logSvc: ILogService,
    private readonly _router: Router,
    private readonly _gigActMgmtSvc: IGigAccountManagementService
  ) { 
    this._logger = logSvc.getLogger("StatsWelcomeComponent");
  }

  ngOnInit() {}

  public connectAccountsClick(){
    this._gigActMgmtSvc.manageGigAccountLinks();
    this._router.navigateByUrl("gig-accounts");
  }

}
