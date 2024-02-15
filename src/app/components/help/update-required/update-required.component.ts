import { Component, OnInit } from '@angular/core';
import { SafeHtml } from '@angular/platform-browser';
import { Browser } from '@capacitor/browser';
import { AppUpdatedRequiredInfo } from 'src/app/models/AppUpdatedRequiredInfo';
import { IDeviceService } from 'src/app/services/device/device.service';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';

@Component({
  selector: 'app-update-required',
  templateUrl: './update-required.component.html',
  styleUrls: [
    '../help.scss',
    './update-required.component.scss'
  ],
})
export class UpdateRequiredComponent implements OnInit {
  private readonly _logger: Logger;

  public title: SafeHtml;
  public message: SafeHtml;
  public info: AppUpdatedRequiredInfo;

  public get isIOS():boolean{
    return this._deviceSvc.is_iOS;
  }

  public get isAndroid():boolean{
    return this._deviceSvc.is_Android;
  }

  constructor(
    logSvc: ILogService,
    private readonly _deviceSvc: IDeviceService
  ) { 
    this._logger = logSvc.getLogger("UpdateRequiredComponent");
  }

  ngOnInit() {}

  public async onAppStoreClick(){

    await Browser.open({
      url: this.info?.store_url,
      presentationStyle: 'fullscreen',
      toolbarColor: "d7d9f9",
    });
  }
}
