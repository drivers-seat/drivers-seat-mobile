import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { StatusBar, Style } from '@capacitor/status-bar';
import { IDeviceService } from 'src/app/services/device/device.service';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: [
    '../onboarding.scss',
    './welcome.component.scss'],
})
export class WelcomeComponent implements OnInit {

  private readonly _logger: Logger;

  public get appDisplayName(): string { return environment.appDisplayName; }

  public readonly slideOpts = {
    autoplay: {
      delay: 3000,
    },
    loop: true
  }

  constructor(
    logSvc: ILogService,
    private readonly _deviceSvc: IDeviceService,
    private readonly _router: Router
  ) {
    this._logger = logSvc.getLogger("WelcomeComponent");
  }

  ngOnInit() { }

  public onLoginClick() {
    this._router.navigateByUrl('login');
  }

  public onContinueClick() {
    this._router.navigateByUrl('onboarding/account');
  }

  public async ionViewWillEnter() {
    this._logger.LogDebug("ionViewWillEnter");
    if (!this._deviceSvc.is_Web) {
      await StatusBar.hide();
    }
  }

  public async ionViewWillLeave() {
    this._logger.LogDebug("ionViewWillEnter");
    if (!this._deviceSvc.is_Web) {
      await StatusBar.show();
    }
  }

}
