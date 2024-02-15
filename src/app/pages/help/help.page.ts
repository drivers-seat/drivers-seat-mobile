import { Component, OnInit } from '@angular/core';
import { MenuController } from '@ionic/angular';
import { ApiService } from '../../services/api.service';
import { UserService } from '../../services/user.service';
import { Features } from 'src/app/models/Features';
import { IDeviceService } from 'src/app/services/device/device.service';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';

@Component({
  selector: 'app-help',
  templateUrl: './help.page.html',
  styleUrls: [
    '../../driversseat-styles.scss',
    './help.page.scss'
  ]
})
export class HelpPage {

  private readonly _logger: Logger;

  public appVersion:string;
  public pointingTo:string;

  public user;
  public originalUser;
  public canGhost : boolean;
  public ghostID;
  public currentGhost;
  public ghostError;

  public get is_iOS():boolean{
    return this._deviceSvc.is_iOS;
  }

  constructor(
    logSvc : ILogService,
    public apiService: ApiService,
    public userService: UserService, 
    public menuController: MenuController,
    private readonly _deviceSvc: IDeviceService
  ){
    this._logger = logSvc.getLogger("HelpPage");
    this.appVersion = this.apiService.getAppVersion();
  }

  ionViewWillEnter() {
    
    this.user = this.userService.currentUser;
    this.originalUser = this.userService.originalUser;

    this.canGhost = this.userService.isFeatureEnabled(Features.GHOST);
    this._logger.LogInfo("ionViewWillEnter", "CanGhost", this.canGhost);
    
    if (this.userService.isUsingGhost) {
      this.currentGhost = this.userService.currentUser;
    }
  }

  submitGhost() {
    if (this.currentGhost) {
      return;
    }
    this.userService.setGhost(this.ghostID)
    .then(user => {
      this.currentGhost = user;
      this.ghostError = null;
      this.ghostID = null;
    }).catch(err => {
      this.ghostError = 'User id not found'
    });
  }

  clearGhost() {
    this.userService.unGhost()
    .then(user => {
      this.ghostError = null;
      this.currentGhost = null;
      this.ghostID = null;
    });
  }

  toggleMenu() {
    this.menuController.enable(true, 'shiftOnRightMenuContentId')
      .then(() =>this.menuController.open('shiftOnRightMenuContentId'));
  }
}
