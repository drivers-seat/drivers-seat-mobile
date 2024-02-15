import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { User } from "src/app/models/User";
import { TrackedEvent } from 'src/app/models/TrackedEvent';
import { dayOfWeek, hourOfDay, IWorkScheduleMatrix, ScheduledShift, ScheduledShiftServerModel, SchedulePickerConfig, UserWorkSettings } from 'src/app/models/UserPreferences';
import { ApiService } from '../api.service';
import { ILogService } from '../logging/log.service';
import { Logger } from '../logging/logger';
import { UserTrackingService } from '../user-tracking/user-tracking.service';
import { UserService } from '../user.service';

export abstract class IWorkScheduleService {
  public abstract getWorkScheduleFromSelections(schedule: IWorkScheduleMatrix): Array<ScheduledShift>;
  public abstract getSelectionsFromWorkSchedule(schedule: Array<ScheduledShift>): IWorkScheduleMatrix;
  public abstract updateSelectionsFromWorkSchedule(selections: IWorkScheduleMatrix, schedule: Array<ScheduledShift>);
  public abstract updateWorkScheduleFromServer();
  public abstract saveWorkSchedule(shifts: Array<ScheduledShift>): Promise<void>;
  public abstract get config(): SchedulePickerConfig;
  public abstract workSchedule$: BehaviorSubject<Array<ScheduledShift>>
}

@Injectable({
  providedIn: 'root'
})
export class WorkScheduleService implements IWorkScheduleService {

  private readonly _logger: Logger;
  private readonly _allDayValues: Array<number>;
  private readonly _allHourValues: Array<number>;

  private readonly _config: SchedulePickerConfig = {
    availableDays: [
      dayOfWeek.monday,
      dayOfWeek.tuesday,
      dayOfWeek.wednesday,
      dayOfWeek.thursday,
      dayOfWeek.friday,
      dayOfWeek.saturday,
      dayOfWeek.sunday
    ],

    availableHours: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]
  }

  private _workSchedule: Array<ScheduledShift>;
  public workSchedule$: BehaviorSubject<Array<ScheduledShift>> = new BehaviorSubject(null);

  private _currentUser: User;

  constructor(
    logSvc: ILogService,
    private readonly _apiSvc: ApiService,
    private readonly _httpSvc: HttpClient,
    private readonly _userSvc: UserService,
    private readonly _userTrackingSvc: UserTrackingService
  ) {
    this._logger = logSvc.getLogger("WorkScheduleService");

    this._allDayValues = Object.values(dayOfWeek)
      .filter((v) => !isNaN(Number(v)))
      .map((v) => Number(v));

    this._allHourValues = Object.values(hourOfDay)
      .filter((v) => !isNaN(Number(v)))
      .map((v) => Number(v));

    this._userSvc.currentUser$.subscribe(u => {
      this._logger.LogDebug("currentUser$", u)
      const oldUser = this._currentUser;
      this._currentUser = u;

      if (!this._currentUser) {

      } else {

        //if the user has changed
        if (oldUser?.id != this._currentUser.id) {
          this.updateWorkScheduleFromServer();
        }
      }
    })
  }

  public get config(): SchedulePickerConfig {
    return this._config;
  }

  public getWorkScheduleFromSelections(selections: IWorkScheduleMatrix): Array<ScheduledShift> {

    const result: Array<ScheduledShift> = [];

    let isOn = false;
    let curScheduleItem: ScheduledShift = null;

    let firstScheduleItem: ScheduledShift = null;

    let curMinuteOfWeek = 0;
    let firstMinuteOfWeek: number = null;
    let firstWorkingMinuteOfWeek: number = null;

    this._allDayValues.forEach(d => {

      //If the selector does not include the day and the
      //user is on-shift, add 24hours (example, M,W,F schedule)
      if (!this.config.availableDays.includes(d)) {

        curMinuteOfWeek += (24 * 60);

        if (curScheduleItem) {
          curScheduleItem.duration_minutes += (24 * 60);
        }
        return;
      }

      this._allHourValues.forEach(h => {

        //If the selector does not include the hour and the user is
        //on-shift, add 1 hour (2-[3]-4)
        if (!this.config.availableHours.includes(h)) {
          curMinuteOfWeek += 60;

          if (curScheduleItem) {
            curScheduleItem.duration_minutes += 60;
          }
          return;
        }

        if (firstMinuteOfWeek == null) {
          firstMinuteOfWeek = curMinuteOfWeek;
        }

        const iterIsOn = selections[d] != null &&
          selections[d][h] != null &&
          selections[d][h];

        //switch from working to non-working
        if (!iterIsOn && isOn) {
          curScheduleItem.end_minute_of_week_local = curMinuteOfWeek;
          result.push(curScheduleItem);
          curScheduleItem = null;
        }
        else if (iterIsOn) {
          //swtich from not working to working
          if (!isOn) {
            curScheduleItem = new ScheduledShift();
            curScheduleItem.start_minute_of_week_local = curMinuteOfWeek;

            firstScheduleItem = firstScheduleItem || curScheduleItem;
            if (firstWorkingMinuteOfWeek == null) {
              firstWorkingMinuteOfWeek = curMinuteOfWeek;
            }
          }
          curScheduleItem.duration_minutes += 60;
        }
        isOn = iterIsOn;
        curMinuteOfWeek += 60;
      });
    });

    //This means that the schedule goes until the end of the last day
    //Schedule is highlighted through EOD Sunday
    if (curScheduleItem) {

      //the first part of monday is selected, move the first work item
      //back to add sunday into it.
      if (firstMinuteOfWeek == firstWorkingMinuteOfWeek) {
        firstScheduleItem.duration_minutes += curScheduleItem.duration_minutes;
        firstScheduleItem.start_minute_of_week_local = curScheduleItem.start_minute_of_week_local;
      } else {
        curScheduleItem.end_minute_of_week_local = 0;
        result.push(curScheduleItem);
      }
    }

    return result;
  }

  public getSelectionsFromWorkSchedule(schedule: Array<ScheduledShift>): IWorkScheduleMatrix {

    this._logger.LogDebug("getSelectionsFromWorkSchedule", schedule);

    const result = {};

    this.updateSelectionsFromWorkSchedule(result, schedule || []);

    this._logger.LogDebug("getSelectionsFromWorkSchedule", schedule, result);
    return result;
  }

  public updateSelectionsFromWorkSchedule(selections: IWorkScheduleMatrix, schedule: Array<ScheduledShift>) {

    this._logger.LogDebug("updateSelectionsFromWorkSchedule", selections, schedule);

    //revise the schedule breaking up any item that extends over the end of the week
    const revisedScheduleItems = schedule.map(s => {
      if (s.start_minute_of_week_local <= s.end_minute_of_week_local) {
        return s;
      } else {
        const item1 = new ScheduledShift();
        item1.duration_minutes = s.end_minute_of_week_local;
        item1.start_minute_of_week_local = 0;
        item1.end_minute_of_week_local = s.end_minute_of_week_local;

        const item2 = new ScheduledShift();
        item2.duration_minutes = (24 * 60 * 7) - s.start_minute_of_week_local;
        item2.start_minute_of_week_local = s.start_minute_of_week_local;
        item2.end_minute_of_week_local = (24 * 60 * 7) + 1;  //not exactly wonderful

        return [item1, item2];
      }
    }).flat();

    this._logger.LogDebug("updateSelectionsFromWorkSchedule", "revisedScheduleItems", revisedScheduleItems)

    this.config.availableDays.forEach(d => {
      selections[d] = selections[d] || {};
      this.config.availableHours.forEach(h => {

        const curStartMinuteOfWeek = ((d * 24) + h) * 60;
        const idx = revisedScheduleItems.findIndex(s => curStartMinuteOfWeek >= s.start_minute_of_week_local && curStartMinuteOfWeek < s.end_minute_of_week_local);

        selections[d][h] = idx >= 0;
      });
    });
  }

  private setWorkSchedule(shifts: Array<ScheduledShift>) {
    this._logger.LogDebug("setWorkSchedule", shifts);
    this._workSchedule = shifts;
    this.workSchedule$.next(this._workSchedule);
  }

  public updateWorkScheduleFromServer() {
    return this._httpSvc.get(`${this._apiSvc.url()}/scheduled_shifts`)
      .toPromise().then(data => {
        this._logger.LogDebug("updateWorkScheduleFromServer", data);
        const serverModels: ScheduledShiftServerModel[] = data["data"];
        const internalModels = serverModels.map(x => ScheduledShiftServerModel.toInternalModel(x));
        this.setWorkSchedule(internalModels);
      });
  }

  public async saveWorkSchedule(shifts: Array<ScheduledShift>): Promise<void> {

    const postModels = shifts.map(x => ScheduledShift.toServerModel(x));

    return this._httpSvc.post(`${this._apiSvc.url()}/scheduled_shifts`,
      {
        scheduled_shifts: postModels
      },
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } })
      .toPromise()
      .then(data => {
        const serverModels: ScheduledShiftServerModel[] = data["data"];
        const internalModels = serverModels.map(x => ScheduledShiftServerModel.toInternalModel(x));
        this.setWorkSchedule(internalModels);
      })
      .finally(()=>{
        this.TrackScheduleChange(postModels);
      });
  }

  private TrackScheduleChange(shifts: Array<ScheduledShiftServerModel>){

    const eventData = {};
    for(let i = 0; i< shifts.length; i++){
      const shift = shifts[i];
      eventData[`shift_${i+1}`] = `${dayOfWeek[shift.start_day_of_week]} ${shift.start_time_local}, ${shift.duration_minutes} min.`;
    }

    this._userTrackingSvc.captureEvent(TrackedEvent.work_schedule_save, eventData);
  }
}
