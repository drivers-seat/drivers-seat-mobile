import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Location } from '@transistorsoft/capacitor-background-geolocation';
import * as moment from 'moment';
import { BehaviorSubject } from 'rxjs';
import { Shift } from '../models/Shift';
import { User } from "../models/User";
import { TrackedEvent } from '../models/TrackedEvent';
import { ApiService } from './api.service';
import { ILocationTrackingService } from './location-tracking/location-tracking.service';
import { ILogService } from './logging/log.service';
import { Logger } from './logging/logger';
import { UserTrackingService } from './user-tracking/user-tracking.service';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root'
})
export class ShiftService {

  //TODO: what is this?
  shifts: Array<Shift>;

  private readonly _logger: Logger;

  private _currentUser: User;
  private _currentLocation: Location;
  private _currentShift: Shift;

  //Allow is based on ghosting or not
  private _allowManageShifts: boolean;

  //Enable is based on location permissions
  private _enableManageShifts: boolean;

  private _authAllowTrack_Always: boolean;
  private _authAllowTrack_WhenInApp: boolean;
  private _authAllowPreciseLocation: boolean;

  private _isTrackingLocation: boolean;

  public readonly allowManageShifts$: BehaviorSubject<boolean>;
  public readonly enableManageShifts$: BehaviorSubject<boolean>;
  public readonly currentShift$: BehaviorSubject<Shift>;
  public readonly curentLocation$: BehaviorSubject<Location>;
  public readonly isTrackingLocation$: BehaviorSubject<boolean>;
  

  constructor(
    logSvc: ILogService,
    private readonly _httpClient: HttpClient,
    private readonly _apiSvc: ApiService,
    private readonly _userSvc: UserService,
    private readonly _locationTrackingSvc: ILocationTrackingService,
    private readonly _userTrackingSvc: UserTrackingService
  ) {
    this._logger = logSvc.getLogger("ShiftService");

    this._logger.LogInfo("Constructor");

    this.allowManageShifts$ = new BehaviorSubject<boolean>(this._allowManageShifts);
    this.enableManageShifts$ = new BehaviorSubject<boolean>(this._enableManageShifts);
    this.currentShift$ = new BehaviorSubject<Shift>(this._currentShift);
    this.curentLocation$ = new BehaviorSubject<Location>(this._currentLocation);
    this.isTrackingLocation$ = new BehaviorSubject<boolean>(this._isTrackingLocation);

    this._userSvc.currentUser$.subscribe(u => {

      this._logger.LogInfo("currentUser$ changed", u);
      if (u) {
        this.userChanged(u);
      }
    });

    this._locationTrackingSvc.isTrackingLocation$.subscribe(isTracking=> this.isTrackingLocationChanged(isTracking));
    this._locationTrackingSvc.currentLocation$.subscribe(loc=>this.setCurrentLocation(loc));
    
    this._locationTrackingSvc.authAllowTrack_Always$.subscribe(allowAlways=>{
      this._authAllowTrack_Always = allowAlways;
      this.setAllowAndEnableShiftTracking();
    });

    this._locationTrackingSvc.authAllowTrack_WhenInApp$.subscribe(allowInApp=>{
      this._authAllowTrack_WhenInApp = allowInApp;
      this.setAllowAndEnableShiftTracking();
    });

    this._locationTrackingSvc.authAllowPreciseLocation$.subscribe(preciseLoc=>{
      this._authAllowPreciseLocation = preciseLoc;
      this.setAllowAndEnableShiftTracking();
    });
  }

  private setAllowAndEnableShiftTracking(forceBroadcast: boolean = false){

    const prevAllowManageShifts = this._allowManageShifts;
    const prevEnableManageShifts = this._enableManageShifts;

    this._allowManageShifts = !this._apiSvc.isGhosting && this._currentUser != null;
    this._enableManageShifts = this._allowManageShifts && this._authAllowTrack_Always && this._authAllowPreciseLocation;
    

    if(forceBroadcast || this._allowManageShifts != prevAllowManageShifts){
      this.allowManageShifts$.next(this._allowManageShifts);
    }

    if(forceBroadcast || this._enableManageShifts != prevEnableManageShifts){
      this.enableManageShifts$.next(this._enableManageShifts);
    }
  }

  private isTrackingLocationChanged(isTracking: boolean): void {
    
    const prev = this._isTrackingLocation;
    this._isTrackingLocation = isTracking;

    if(this._isTrackingLocation != prev){
      this.isTrackingLocation$.next(this._isTrackingLocation);
    }
  }

  private userChanged(user: User) {

    this._currentUser = user;

    this.setAllowAndEnableShiftTracking();

    //If user cannot manage shifts or the back end indicates that the user
    //is not on shift, clear out the currently tracked shift (if necessary) 
    //and return.
    // if (!this._allowManageShifts || !this._enableManageShifts || !this._currentUser.currently_on_shift) {
    if (!this._currentUser.currently_on_shift) {

      if (this._currentShift) {
        this._logger.LogInfo("userChanged", "clearing shift", this._currentShift);
        this.setCurrentShift(null);
      }
      return;
    }

    //Get the shift
    this._logger.LogInfo("userChanged", `current user on-shift ${this._currentUser.currently_on_shift}.`);

    this.getShift(this._currentUser.currently_on_shift)
      .then((shift) => {

        //If the back-end indicates that references shift has ended, clear the
        //tracked shift and publish this change
        if (shift.end_time) {

          this._logger.LogInfo("userChanged", "current user shift has ended, ignoring",
            `user=${this._currentUser.id}`,
            `shift=${this._currentUser.currently_on_shift}`);
          
          if (this._currentShift?.id == shift.id) {
            this.setCurrentShift(null);
          }

          return;
        }

        this.setCurrentShift(shift);
      })
      .catch((ex)=>{
        this._logger.LogError(ex, "Exception obtaining shift from api", 
          `user=${this._currentUser.id}`,
          `shift=${this._currentUser.currently_on_shift}`);
      });
  }

  private setCurrentShift(shift?: Shift) {

    const prevShift = this._currentShift;
    this._currentShift = shift;
    this.currentShift$.next(this._currentShift);

    //If null, means no current shift
    if (!this._currentShift) {

      this._logger.LogInfo("setCurrentShift", "Requesting Location Tracking to stop");
      this._locationTrackingSvc.stopTracking()
        .then(() => {
          this._logger.LogDebug("setCurrentShift", "Requesting Location Tracking to stop", "stopped");
        })
        .catch(ex => {
          this._logger.LogError(ex, "setCurrentShift", "Requesting Location Tracking to stop", "failed");
        });

      return;
    }

    //If we are currently tracking a shift and this is a new shift, reset the odometer
    //This is an edge case, but could happen.
    if (prevShift && prevShift.id != this._currentShift.id) {
      this._logger.LogInfo("setCurrentShift", "Requesting odometer reset");
      this._locationTrackingSvc.resetOdometer()
        .then(()=>{
          this._logger.LogDebug("setCurrentShift", "Requesting odometer reset", "success");
        })
        .catch(ex => {
          this._logger.LogError(ex, "setCurrentShift", "Requesting odometer reset", "failed");
        });
    }

    //We can make this call knowing that the background location plugin will
    //use a location captured within the last 5-sec instead of asking the hardware to pull
    //a new location.
    this._logger.LogInfo("setCurrentShift", "Requesting current location")
    this._locationTrackingSvc.getCurrentLocation()
      .then(loc => {
        this.setCurrentLocation(loc)
      })
      .catch(ex => {
        this._logger.LogError(ex, "setCurrentShift", "Requesting current location", "failed");
      });

    //The location tracking service will ensure that we don't restart an already started service
    this._logger.LogInfo("setCurrentShift", "Start Location Tracking")
    this._locationTrackingSvc.startTracking()
      .then(()=>{
        this._logger.LogDebug("setCurrentShift", "Start Location Tracking","success");
      })
      .catch(ex=>{
        this._logger.LogError(ex, "setCurrentShift", "Start Location Tracking", "failure");
      });
  }

  private setCurrentLocation(location: Location) {
    this._currentLocation = location;
    this.curentLocation$.next(location);
  }

  public async startShift() : Promise<void> {

    if (!this._allowManageShifts) {
      this._logger.LogWarning("startShift", "Ignoring Request, currently ghosting");
      return;
    }

    if (this._currentShift) {
      this._logger.LogWarning("startShift", "Ignoring Request, already on-shift");
      return;
    }

    this._logger.LogInfo("startShift","New Shift","starting")

    const newShiftReq = {
      "shift": {
        "user_id": this._currentUser.id,
        "start_time": moment().utc().format(),
      }
    };

    const newShiftResp = await this._httpClient.post(`${this._apiSvc.url()}/shift`,
      JSON.stringify(newShiftReq),
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      ).toPromise();

    const newShift = this.parseShift(newShiftResp["data"]);

    this._logger.LogInfo("startShift","New Shift","started", newShift);

    //fire and forget
    this._userTrackingSvc.captureEvent(TrackedEvent.shift_start, newShift),

    await this._locationTrackingSvc.resetOdometer()

    this.setCurrentShift(newShift)
  }

  public async endShift(): Promise<Shift> {

    if (!this._allowManageShifts) {
      this._logger.LogWarning("endShift", "Ignoring Request, currently ghosting");
      return null;
    }

    if (!this._currentShift) {
      this._logger.LogWarning("endShift", "Ignoring Request, current shift is NULL");
      return null;
    }

    this._logger.LogInfo("endShift", this._currentShift.id);

    const endShiftReq = {
      "shift": {
        "end_time": moment().utc().format(),
      }
    } 

    const endShiftResp = await this._httpClient.put(`${this._apiSvc.url()}/shift/${this._currentShift.id}`,
      JSON.stringify(endShiftReq),
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } })
      .toPromise();

    const endedShift = this.parseShift(endShiftResp["data"]);

    this._logger.LogInfo("endShift", "ended", endedShift);

    //fire and forget
    this._userTrackingSvc.captureEvent(TrackedEvent.shift_end, endedShift);

    this.setCurrentShift(null);

    return endedShift;
  }

  private parseShift(data:any):Shift{
    const result = new Shift();

    result.user_id = data["user_id"],
    result.start_time = data["start_time"],
    result.end_time = data["end_time"],
    result.id = data["id"],
    result.frontend_mileage = data["frontend_mileage"]

    return result;
  }

  getShift(shiftID) {
    return this._httpClient.get(`${this._apiSvc.url()}/shift/${shiftID}`)
      .toPromise().then(data => {
        return this.parseShift(data["data"]);
      });
  }

}
