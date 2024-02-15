import { THIS_EXPR } from '@angular/compiler/src/output/output_ast';
import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { IonSlides, Platform } from '@ionic/angular';
import { TrackedEvent } from 'src/app/models/TrackedEvent';
import { IBrowserNavigationService } from 'src/app/services/browser-navigation/browser-navigation.service';
import { IDeviceService } from 'src/app/services/device/device.service';
import { ILocationTrackingService } from 'src/app/services/location-tracking/location-tracking.service';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import { IMarketingService } from 'src/app/services/marketing/marketing.service';
import { IModalService } from 'src/app/services/modal/modal.service';
import { UserTrackingService } from 'src/app/services/user-tracking/user-tracking.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'shift-tracking-help',
  templateUrl: './shift-tracking-help.component.html',
  styleUrls: [
    '../shifts.scss',
    './shift-tracking-help.component.scss'],
})
export class ShiftTrackingHelpComponent implements OnInit {

  private readonly _logger: Logger;

  public get appDisplayName(): string { return environment.appDisplayName; }

  public readonly slideOpts = {
    autoplay: {
      delay: 5000
    },
    loop: false
  }

  public isLastSlide: boolean;
  public isFirstSlide: boolean;
  public slideIdx: number;
  public slideCount: number;
  public slidex: Array<any>;

  public isModal: boolean = false;

  constructor(
    logSvc: ILogService,
    private readonly _locationSvc: ILocationTrackingService,
    private readonly _deviceSvc: IDeviceService,
    private readonly _platformSvc: Platform,
    private readonly _browserNavSvc: IBrowserNavigationService,
    private readonly _modalSvc: IModalService,
    private readonly _marketingSvc: IMarketingService,
    private readonly _userTrackSvc: UserTrackingService
  ) {
    this._logger = logSvc.getLogger("ShiftTrackingWelcomeComponent");

    this._locationSvc.authAllowPreciseLocation$.subscribe(async () => this.onChange());
    this._locationSvc.authAllowTrack_Always$.subscribe(async () => this.onChange());
    this._locationSvc.authAllowTrack_WhenInApp$.subscribe(async () => this.onChange());
    this._platformSvc.resume.subscribe(async () => this.onChange());
    this.onChange();
  }

  private async onChange() {
    this.isConfigured = this._locationSvc.authAllowPreciseLocation$.value && this._locationSvc.authAllowTrack_Always$.value;
  }

  public get isIos(): boolean { return this._deviceSvc.is_iOS; }
  public get isAndroid(): boolean { return this._deviceSvc.is_Android; }
  public get isWeb(): boolean { return this._deviceSvc.is_Web; }

  public isConfigured: boolean

  ngOnInit() { }

  public ionViewDidEnter(){
    this._marketingSvc.pause("shifts/help");
  }

  public async openSettingsClick() {
    await this._locationSvc.requestPermissions();
    await this._userTrackSvc.captureEvent(TrackedEvent.location_permissions_open);
  }

  public async cancelClick() {
    
    if (this.isModal){
      await this._modalSvc.dismiss();
    } else {
      await this._browserNavSvc.requestNavigation(false, false, false);
    }

    this._marketingSvc.resume("shifts/help");
  }

  public async onSetUpReminders() {
    if (this.isModal){
      await this._modalSvc.dismiss();
    }

    await this._browserNavSvc.requestNavigation(false, false, false, "/work-settings");

    this._marketingSvc.resume("shifts/help");
  }
}