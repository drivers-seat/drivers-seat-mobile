import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Haptics, NotificationType } from '@capacitor/haptics';
import { AverageHourlyPaySummary, IPerformanceBin } from 'src/app/models/CommunityInsights';
import { HourlyPayAnalyticsOptions } from 'src/app/models/HourlyPayAnalyticsOptions';
import { PreferenceType } from 'src/app/models/PreferenceType';
import { dayOfWeek, hourOfDay, IWorkScheduleMatrix } from 'src/app/models/UserPreferences';
import { IAnalyticsService } from 'src/app/services/analytics/analytics.service';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import { ILookupDataService } from 'src/app/services/lookup-data/lookup-data.service';
import { IPreferenceService } from 'src/app/services/preferences/preferences.service';
import { IWorkScheduleService } from 'src/app/services/work-schedule/work-schedule.service';

export interface IMissingValue {
  day: dayOfWeek,
  hour: hourOfDay
}

@Component({
  selector: 'hourly-pay-heatmap',
  templateUrl: './hourly-pay-analytics-heatmap.component.html',
  styleUrls: [
    '../hourly-pay-analytics.scss',
    './hourly-pay-analytics-heatmap.component.scss'],
})
export class HourlyPayAnalyticsHeatmapComponent implements OnInit {

  private readonly _logger: Logger;

  private _performanceStats: AverageHourlyPaySummary[];
  
  @Input()
  public get PerformanceStats(): AverageHourlyPaySummary[]{
    return this._performanceStats;
  }

  public set PerformanceStats(stats:AverageHourlyPaySummary[]){
    if(this._performanceStats == stats){
      return;
    }

    this._performanceStats = stats;
    this.buildStatsMatrix();
  }
  


  private _options: HourlyPayAnalyticsOptions;
  private _workSchedule: IWorkScheduleMatrix;
  private _performanceBins: Array<IPerformanceBin>;

  @Output()
  public metricSelected: EventEmitter<AverageHourlyPaySummary> = new EventEmitter();

  @Output()
  public missingValueSelected: EventEmitter<IMissingValue> = new EventEmitter();

  public statsMatrix: {
    [key: number]: {
      [key: string]: AverageHourlyPaySummary
    }
  };

  public valuePropFx: (AverageHourlyPaySummary) => number;
  public textPropFx: (AverageHourlyPaySummary) => string;

  public days: Array<dayOfWeek> = [dayOfWeek.monday, dayOfWeek.tuesday, dayOfWeek.wednesday, dayOfWeek.thursday, dayOfWeek.friday, dayOfWeek.saturday, dayOfWeek.sunday];
  public hours: Array<hourOfDay> = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
  public countBins: number = 10;

  constructor(
    logSvc: ILogService,
    private readonly _analyticsSvc: IAnalyticsService,
    private readonly _lookupDataSvc: ILookupDataService,
    private readonly _preferenceSvc: IPreferenceService,
    private readonly _workscheduleSvc: IWorkScheduleService
  ) {
    this._logger = logSvc.getLogger("HourlyPayAnalyticsHeatmapComponent");

    this._preferenceSvc.subscribe(PreferenceType.HourlyPayAnalytics, options=>{
      this._logger.LogInfo("Options Change Detected", options);
      this._options = options?.value;
      this.onOptionsChanged();
    });

    this._workscheduleSvc.workSchedule$.subscribe(schedule=>{
      if(!schedule){
        this._workSchedule = null;
        return;
      }

      this._workSchedule = this._workscheduleSvc.getSelectionsFromWorkSchedule(schedule);
    });
  }

  ngOnInit() {
  }

  public getDayText(day: dayOfWeek): string {
    return dayOfWeek[day]?.substring(0, 2).toUpperCase();
  }

  public getHourText(hour: hourOfDay): string {

    let hourDisp = hour % 12;
    if (hourDisp == 0) {
      hourDisp = 12;
    }
    return `${hourDisp}${hour >= 12 ? 'P' : 'A'}`;
  }

  public getStatValue(day: dayOfWeek, hour: hourOfDay): string {
    
    if(!this.valuePropFx || !this.statsMatrix || !this.statsMatrix[day] || !this.statsMatrix[day][hour]){
      return "-";
    }

    const val = this.valuePropFx(this.statsMatrix[day][hour]);
    return val == null ? "-" : `$${val.toFixed(0)}`;
  }

  public getStatPerfBin(day: dayOfWeek, hour: hourOfDay): string {
    if(!this.statsMatrix || !this.statsMatrix[day] || !this.statsMatrix[day][hour]){
      return 'empty';
    }

    const bin = this.statsMatrix[day][hour]["perfBin"];
    return bin == null ? 'empty' : `${bin}`;
  }

  public getStatText(day: dayOfWeek, hour: hourOfDay): string {
    
    if(!this.textPropFx || !this.statsMatrix || !this.statsMatrix[day] || !this.statsMatrix[day][hour]){
      return null;
    }

    return this.textPropFx(this.statsMatrix[day][hour]);
  }

  public getIsScheduled(day: dayOfWeek, hour: hourOfDay): boolean {
    
    if(!this._options?.highlight_work_schedule || !this._workSchedule){
      return false;
    }
    return this._workSchedule[day][hour] == true;
  }

  public viewDetail(day, hour) {

    if (!this.statsMatrix) {
      return;
    }

    const metric = this.statsMatrix[day][hour];

    if (metric && metric.metro_area_id) {
      this.metricSelected.emit(metric);
    }
    else {
      this.missingValueSelected.emit({ day: day, hour: hour });
    }
  }

  private onOptionsChanged() {

    this._logger.LogDebug("onOptionsChanged", this._options);
    this.valuePropFx = this._analyticsSvc.getDisplayValuePropertyDelegate(this._options);
    this.textPropFx = this._analyticsSvc.getDisplayTextPropertyDelegate(this._options);
  }

  private buildStatsMatrix() {

    this._logger.LogDebug("buildStatsMatrix");

    const statsMatrix = {};

    this._performanceStats.forEach(stat => {

      if (stat.day_of_week == null || stat.hour_of_day == null) {
        return;
      }

      statsMatrix[stat.day_of_week] = statsMatrix[stat.day_of_week] || {};
      statsMatrix[stat.day_of_week][stat.hour_of_day] = stat;
    });

    this.days.forEach(d => {
      statsMatrix[d] = statsMatrix[d] || {};
      this.hours.forEach(h => {
        statsMatrix[d][h] = statsMatrix[d][h] || {}
      })
    })

    this.statsMatrix = statsMatrix;

    this._logger.LogDebug("buildStatsMatrix", this.statsMatrix);
  }

  private _mode: "scrolling" | "clicking" = "scrolling";
  private _selectTimer;
  private _touch_StartX: number;
  private _touch_StartY: number;
  async touchStart(event: any) {

    this._logger.LogDebug("touchStart",event);
    if (this._selectTimer) {
      clearTimeout(this._selectTimer);
      this._selectTimer = null;
    }

    const day = event?.target?.attributes["day"]?.value;
    const hour = event.target?.attributes["hour"]?.value;
    
    if (!day || !hour) {
      return;
    }

    await Haptics.selectionStart();

    //For 1/2 sec, if the user moves, they intend to scroll.
    //Otherwise, change mode to "Selecting/Deselecting" and track
    //their movement.
    this._mode = "clicking";
    this._touch_StartX = event.touches[0].clientX;
    this._touch_StartY = event.touches[0].clientY;

    this._selectTimer = setTimeout(async () => {
      this._selectTimer = null;
      await Haptics.notification({
        type: NotificationType.Success
      });
      this.viewDetail(day, hour);
      this._mode = 'scrolling';
    }, 500);
  }

  async touchEnd(event: any) {
    if (this._mode == "clicking") {
      const elem = event.target;
      const day = elem?.attributes["day"]?.value;
      const hour = elem?.attributes["hour"]?.value;
      this.viewDetail(day, hour);
    }

    this._mode = 'scrolling';

    if (this._selectTimer) {
      clearTimeout(this._selectTimer);
      this._selectTimer = null;
    }

    await Haptics.selectionEnd();
  }

  async touchMove(event: TouchEvent) {

    //If we are in scroll mode, do nothing and let 
    //the default scrolling behavior take over.
    if (this._mode == 'scrolling') {
      return;
    }

    const clientX = event.touches[0].clientX;
    const clientY = event.touches[0].clientY;

    //If in the wait and see period, see how far the user has moved.
    //If a big move, assume that user wants to scroll and cancel the
    //wait and see timer.
    if (this._selectTimer) {

      const diffX = clientX - this._touch_StartX;
      const diffY = clientY - this._touch_StartY;

      //This handles slight drift of user finger on the device.
      if (diffX < 10 && diffX > -10 && diffY < 10 && diffY > -10) {
        return;
      }

      clearTimeout(this._selectTimer);
      this._selectTimer = null;
      this._mode = "scrolling";

      Haptics.selectionEnd();
      return;
    }

    //Prevent scrolling behavior
    event.preventDefault();

    const elem = document.elementFromPoint(clientX, clientY);
    const day = elem?.attributes["day"]?.value;
    const hour = elem?.attributes["hour"]?.value;

    if (!day || !hour) {
      return;
    }

    this.viewDetail(day, hour);
  }
}
