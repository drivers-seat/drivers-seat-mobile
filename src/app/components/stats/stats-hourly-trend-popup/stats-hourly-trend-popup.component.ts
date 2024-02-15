import { Component, Input, OnInit } from '@angular/core';
import { IGigPlatformService } from 'src/app/services/gig-platform/gig-platform.service';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import { IModalService } from 'src/app/services/modal/modal.service';

@Component({
  selector: 'app-stats-hourly-trend-popup',
  templateUrl: './stats-hourly-trend-popup.component.html',
  styleUrls: ['./stats-hourly-trend-popup.component.scss'],
})
export class StatsHourlyTrendPopupComponent implements OnInit {

  private readonly _logger: Logger;

  @Input()
  public get employer():string{
    return this._employer;
  } 

  public set employer(value:string){
    if(value == this._employer){
      return;
    }

    this._employer = value;
    this.onDataUpdate();
  }

  private _employer: string;


  @Input()
  public get hourlyPayStats():any[]{
    return this._hourlyPayStats;
  } 

  public set hourlyPayStats(value:any[]){
    if(value == this._hourlyPayStats){
      return;
    }

    this._hourlyPayStats = value;
    this.onDataUpdate();
  }

  private _hourlyPayStats: any[];


  public hourlyPayStatsForDisplay: any[];

  constructor(
    logSvc: ILogService,
    private readonly _gigPlatformSvc: IGigPlatformService,
    private readonly _modalSvc: IModalService
  ) {
    this._logger = logSvc.getLogger("StatsHourlyTrendPopupComponent");
  }

  ngOnInit() { }

  public formatTime(hours: number, minutes: number): string {
    let min = `${minutes || 0}`.padStart(2, "0");
    return `${hours || 0}:${min}`;
  }

  public getEmployerColor(employer: string): string {

    return employer == null
      ? "gray"
      : this._gigPlatformSvc.getEmployerColorDark(employer) || "gray";
  }

  public async close(){
    await this._modalSvc.dismiss();
  }

  private onDataUpdate(){
    if(this._employer && this._hourlyPayStats){

      this.hourlyPayStatsForDisplay = this._hourlyPayStats
        .filter(s=>s[this._employer])
        .sort(s=>s.window.key)
        .reverse();
    }
  }

}
