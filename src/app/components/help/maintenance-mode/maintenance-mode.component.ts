import { Component, OnInit } from '@angular/core';
import { SafeHtml } from '@angular/platform-browser';
import { MaintenanceModeInfo } from 'src/app/models/MaintenanceModeInfo';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import { UserService } from 'src/app/services/user.service';

@Component({
  selector: 'app-maintenance-mode',
  templateUrl: './maintenance-mode.component.html',
  styleUrls: [
    '../help.scss',
    './maintenance-mode.component.scss'
  ]
})
export class MaintenanceModeComponent implements OnInit {

  private readonly _logger: Logger;

  public title: SafeHtml;
  public message: SafeHtml;
  public info: MaintenanceModeInfo;

  constructor(
    logSvc: ILogService,
  ) {
    this._logger = logSvc.getLogger("MaintenanceModeComponent");
  }

  ngOnInit() { 
  }

}
