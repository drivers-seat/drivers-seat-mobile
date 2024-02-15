import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import { ShiftService } from 'src/app/services/shift.service';
import { Location } from '@transistorsoft/capacitor-background-geolocation';
import { Shift } from 'src/app/models/Shift';
import * as moment from 'moment';

@Component({
  selector: 'shift-tracking-stats',
  templateUrl: './shift-tracking-stats.component.html',
  styleUrls: ['./shift-tracking-stats.component.scss'],
})
export class ShiftTrackingStatsComponent implements OnInit {

  private readonly _logger: Logger;
  private _currentLocation: Location;
  private _currentShift: Shift;

  public shiftDuration: string;
  public shiftDistance: string;

  public get isTracking(): boolean {
    return this._currentShift && !this._currentShift.end_time;
  }

  constructor(
    logSvc: ILogService,
    private readonly _shiftSvc: ShiftService,
    private readonly _changeDetectorRef: ChangeDetectorRef,
  ) { 
    this._logger = logSvc.getLogger("ShiftTrackingStatsComponent");

    this._shiftSvc.curentLocation$.subscribe(location=>{
      this._currentLocation = location;
      this.updateUIStats();
    });

    this._shiftSvc.currentShift$.subscribe(shift=>{
      this._currentShift = shift;
      this.updateUIStats();
    })
  }

  ngOnInit() {}

  private updateUIStats(){
    
    this._logger.LogInfo("updateUIStats");

    //There is no shift, or the current shift has ended
    if(!this._currentShift || this._currentShift.end_time){

      this._logger.LogInfo("updateUIStats", "No Shift", this._currentShift);

      this.shiftDistance = null;
      this.shiftDuration = null;
     
      setTimeout(() => {
        this._changeDetectorRef.detectChanges();
      }, 0);
      
      return;
    }

    //Calculate the current shift duration.
    const currentTime = moment().utc()
    const shiftStartTime =  moment(this._currentShift.start_time);
    const shiftDurationInMinutes = currentTime.diff(shiftStartTime, 'minutes');
    const shiftDurationHours = Math.floor(shiftDurationInMinutes / 60);
    const shiftDurationMinutes = shiftDurationInMinutes % 60;

    const shiftDurationInSeconds = currentTime.diff(shiftStartTime, 'seconds');
    const shiftDurationSeconds = shiftDurationInSeconds % 60;

    const shiftDistanceMiles = (this._currentLocation?.odometer || 0) * 0.000621371;

    this.shiftDistance = null;
    this.shiftDuration = null;


    this.shiftDuration = "";

    if(shiftDurationHours >=1 ){
      this.shiftDuration += `${shiftDurationHours.toFixed(0)} hr`;
    }

    if(shiftDurationMinutes >= 1){
      this.shiftDuration += ` ${shiftDurationMinutes} min`;
    }

    if(shiftDurationSeconds > 0 && shiftDurationHours < 1){
      this.shiftDuration += ` ${shiftDurationSeconds} sec`;
    }

    this.shiftDistance = "";

    if(shiftDistanceMiles == 1){
      this.shiftDistance = `1 mile`;
    } else if(shiftDistanceMiles >= .1){
      this.shiftDistance = `${shiftDistanceMiles.toFixed(1)} miles`;
    }

    //Since this may be called as part of an event subscription, foce the detect changes to occur
    //outside of this thread.
    setTimeout(() => {
      this._changeDetectorRef.detectChanges();
    }, 0);
  }
}
