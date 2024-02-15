import { Component, OnInit } from '@angular/core';
import { StatusBar } from '@capacitor/status-bar';
import { getYear } from 'date-fns';
import { ApiService } from 'src/app/services/api.service';
import { IDeviceService } from 'src/app/services/device/device.service';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-splash',
  templateUrl: './splash.page.html',
  styleUrls: ['./splash.page.scss'],
})
export class SplashPage implements OnInit {


  public appVersion: string;
  public currentYear: number;
  private readonly _logger: Logger;
  public get orgDisplayName(): string { return environment.orgDisplayName; }

  // I hate that we have to do this, but I've spent so much time trying to
  //  figure out why the splash screen won't load and it's driving me crazy.
  //  Once it's back, we can delete this page
  constructor(
    logSvc: ILogService,
    private readonly _deviceSvc: IDeviceService,
    private readonly _apiSvc: ApiService
  ) {
    this._logger = logSvc.getLogger("SplashPage");
    this.appVersion = _apiSvc.appReleaseVersion;
    this.currentYear = getYear(new Date());
  }

  ngOnInit() {
  }

  public async ionViewWillEnter() {
    this._logger.LogDebug("ionViewDidEnter");

    if (!this._deviceSvc.is_Web) {
      await StatusBar.hide()
    }
  }

  public async ionViewWillLeave() {
    this._logger.LogDebug("ionViewDidEnter");

    if (!this._deviceSvc.is_Web) {
      await StatusBar.show();
    }
  }

}
