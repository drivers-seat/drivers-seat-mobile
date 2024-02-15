import { Component, OnInit } from '@angular/core';
import { TextHelper } from 'src/app/helpers/TextHelper';
import { User } from 'src/app/models/User';
import { ApiService } from 'src/app/services/api.service';
import { IBrowserNavigationService } from 'src/app/services/browser-navigation/browser-navigation.service';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import { UserService } from 'src/app/services/user.service';

@Component({
  selector: 'dashboard-header',
  templateUrl: './dashboard-header.component.html',
  styleUrls: [
    '../dashboard.scss',
    './dashboard-header.component.scss'
  ],
})
export class DashboardHeaderComponent implements OnInit {

  private readonly _logger: Logger;

  public readonly TextHelper:TextHelper = TextHelper.instance;

  public get user():User{
    return this._userSvc.currentUser;
  }

  public get isGhosting():boolean{
    return this._apiSvc.isGhosting;
  }

  constructor(
    logSvc: ILogService,
    private readonly _userSvc: UserService,
    private readonly _apiSvc: ApiService,
    private readonly _browserNavSvc: IBrowserNavigationService
  ) {
    this._logger = logSvc.getLogger("HeaderComponent");
    
  }

  ngOnInit() {}

  public async onProfileClick(){
    await this._browserNavSvc.requestNavigation(false,false,false, "profile");
  }
}
