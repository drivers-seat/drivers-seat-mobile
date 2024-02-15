import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Haptics } from '@capacitor/haptics';
import { AlertController, Platform } from '@ionic/angular';
import { Location } from '@transistorsoft/capacitor-background-geolocation';
import { Shift } from 'src/app/models/Shift';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import { ShiftService } from 'src/app/services/shift.service';
import { ShiftSummaryComponent } from '../shift-summary/shift-summary.component';
import { ShiftTrackingWelcomeComponent } from '../shift-tracking-welcome/shift-tracking-welcome.component';
import { IModalService } from 'src/app/services/modal/modal.service';
import { IBrowserNavigationService } from 'src/app/services/browser-navigation/browser-navigation.service';
import { ShiftTrackingHelpComponent } from '../shift-tracking-help/shift-tracking-help.component';

@Component({
  selector: 'shift-tracking-toggle',
  templateUrl: './shift-tracking-toggle.component.html',
  styleUrls: [
    '../../../driversseat-styles.scss',
    './shift-tracking-toggle.component.scss'
  ],
})
export class ShiftTrackingToggleComponent implements OnInit {

  private readonly _logger: Logger;

  public allowManageShifts: boolean;
  public enableManageShifts: boolean;

  public get onShift(): boolean {
    return this._currentShift && !this._currentShift.end_time;
  }


  private _currentLocation: Location;
  private _currentShift: Shift;

  //Locks control while processing user request to start/stop shift
  //until after the back-end has completed its work.  Otherwise it's
  //too easy to get into a conflicting states
  public ToggleCtrlLocked: boolean = false;

  constructor(
    logSvc: ILogService,
    private readonly _shiftSvc: ShiftService,
    private readonly _changeDetectorRef: ChangeDetectorRef,
    private readonly _modalSvc: IModalService,
    private readonly _browserNavSvc: IBrowserNavigationService,
  ) {
    this._logger = logSvc.getLogger("ShiftTrackingToggleComponent");

    this._shiftSvc.allowManageShifts$.subscribe(allow => {
      this.allowManageShifts = allow;
      this.onChanges();
    });

    this._shiftSvc.enableManageShifts$.subscribe(allow => {
      this.enableManageShifts = allow;
      this.onChanges();
    });

    this._shiftSvc.curentLocation$.subscribe(loc => {
      this._currentLocation = loc;
    })

    this._shiftSvc.currentShift$.subscribe(shift => {
      this._currentShift = shift;
    });
  }

  private onChanges(){

    this._logger.LogDebug("onChanges", "allow shifts", this.allowManageShifts, "enable shifts", this.enableManageShifts)
    setTimeout(() => {
      this._changeDetectorRef.detectChanges();
    }, 0);
  }

  ngOnInit() { }

  public async openHelpUnableToStartShift() {
    await this._modalSvc.open("shifts/help", {
      component: ShiftTrackingHelpComponent
    });
  }

  private async startShift() {

    if(this.ToggleCtrlLocked){
      return;
    }

    this.ToggleCtrlLocked = true;
    await this._shiftSvc.startShift()
      .finally(() => {
        this.ToggleCtrlLocked = false;
      });
  }

  private async endShift() {

    if(this.ToggleCtrlLocked){
      return;
    }

    this.ToggleCtrlLocked = true;
    const lastLoc = this._currentLocation;

    await this._shiftSvc.endShift()
      .then(s => {
        this.showShiftSummary(s, lastLoc);
      })
      .finally(() => {
        this.ToggleCtrlLocked = false;
      });
  }

  public async toggleShift() {
    if (this.ToggleCtrlLocked) {
      return;
    }

    await Haptics.selectionStart();

    await Haptics.vibrate({duration: 500});

    const promise = this.onShift
      ? this.endShift()
      : this.startShift();

    await promise.finally(async () => { await Haptics.selectionEnd(); });
  }

  public async showShiftSummary(shift: Shift, lastLocation: Location) {

    await this._modalSvc.open("shift/summary",{
      component: ShiftSummaryComponent,
      componentProps: {
        shift: shift,
        lastLocation: lastLocation
      }
    },shift);
  }
}
