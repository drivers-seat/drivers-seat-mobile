import { Component, Input, OnInit } from '@angular/core';
import { Shift } from 'src/app/models/Shift';
import { ILogService } from 'src/app/services/logging/log.service';
import { parseISO, differenceInHours, differenceInMinutes, format, addMinutes, addSeconds, addHours, setSeconds, getUnixTime } from 'date-fns';
import { Logger } from 'src/app/services/logging/logger';
import { Location } from '@transistorsoft/capacitor-background-geolocation';
import { Router } from '@angular/router';
import { StatsService } from 'src/app/services/stats/stats.service';
import { StatSummaryLevel } from 'src/app/models/PerformanceStatistic';
import { IModalService } from 'src/app/services/modal/modal.service';

@Component({
  selector: 'shift-summary',
  templateUrl: './shift-summary.component.html',
  styleUrls: [
    './shift-summary.component.scss']
})
export class ShiftSummaryComponent {

  @Input()
  shift: Shift;

  @Input()
  lastLocation: Location;

  private _startTime : Date;
  private _endTime: Date;

  public startTime_formatted : string;
  public startDate_formatted : string;
  public endTime_formatted : string;
  public endDate_formatted : string;

  public duration_hours : number;
  public duration_minutes : number;
  public distance_miles: number;

  private readonly _logger : Logger;

  constructor(
    loggerSvc : ILogService,
    private readonly _modalSvc : IModalService,
    private readonly _routerSvc: Router,
    private readonly _statsSvc: StatsService
  ) { 
    this._logger = loggerSvc.getLogger("ShiftSummaryComponent");
  }

  ionViewDidEnter() {

    this._logger.LogInfo("ionViewDidEnter", this.shift)

    if(!this.shift){
      return;
    }

    if(this.shift.start_time){
      this._startTime = setSeconds(parseISO(this.shift?.start_time),0);
      this.startTime_formatted = format(this._startTime,"h:mm a");
      this.startDate_formatted = format(this._startTime,"M/d/yyyy");
    }

    if(this.shift.end_time){
      this._endTime = parseISO(this.shift?.end_time);
      this.endTime_formatted = format(this._endTime, "h:mm a");
      this.endDate_formatted = format(this._endTime,"M/d/yyyy");
    }

    this.duration_hours = differenceInHours(this._endTime, this._startTime);
    this.duration_minutes = differenceInMinutes(this._endTime, this._startTime) % 60;

    //Calculate estimated mileage
    this.distance_miles = (this.lastLocation?.odometer || 0) * 0.000621371;
  }

  public async closeModal(){
    await this._modalSvc.dismiss();
  }

  public async addExpenses() {
    
    const window = this._statsSvc.getStatsWindowForDate(this._startTime || this._endTime || new Date(), StatSummaryLevel.day);

    const startUnix = getUnixTime(window.startRange);
    await this._routerSvc.navigateByUrl(`/expenses/list?start=${startUnix}&level=${window.summaryLevel}&addNew=true`);
    await this.closeModal();
  }

}
