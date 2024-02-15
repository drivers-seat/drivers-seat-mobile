import { Component, OnInit } from '@angular/core';
import { ILocationTrackingService } from 'src/app/services/location-tracking/location-tracking.service';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import { IModalService } from 'src/app/services/modal/modal.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-shift-tracking-welcome',
  templateUrl: './shift-tracking-welcome.component.html',
  styleUrls: [
    '../shifts.scss',
    './shift-tracking-welcome.component.scss'
  ],
})
export class ShiftTrackingWelcomeComponent implements OnInit {

  private readonly _logger: Logger;

  public get appDisplayName(): string { return environment.appDisplayName; }

  constructor(
    logSvc: ILogService,
    private readonly _modalSvc: IModalService,
    private readonly _locationSvc: ILocationTrackingService
  ) {
    this._logger = logSvc.getLogger("ShiftTrackingWelcomeComponent");
  }

  ngOnInit() { }

  public async openSettingsClick() {
    await this._locationSvc.requestPermissions()
      .then(() => this.cancelClick());
  }

  public async cancelClick() {
    await this._modalSvc.dismiss();
  }
}
