import { TimeHelper } from "../helpers/TimeHelper";

export enum dayOfWeek {
  sunday = 0,
  monday = 1,
  tuesday = 2,
  wednesday = 3,
  thursday = 4,
  friday = 5,
  saturday = 6
};

export enum hourOfDay {
  "12am" = 0,
  "1am" = 1,
  "2am" = 2,
  "3am" = 3,
  "4am" = 4,
  "5am" = 5,
  "6am" = 6,
  "7am" = 7,
  "8am" = 8,
  "9am" = 9,
  "10am" = 10,
  "11am" = 11,
  "12pm" = 12,
  "1pm" = 13,
  "2pm" = 14,
  "3pm" = 15,
  "4pm" = 16,
  "5pm" = 17,
  "6pm" = 18,
  "7pm" = 19,
  "8pm" = 20,
  "9pm" = 21,
  "10pm" = 22,
  "11pm" = 23
};

export class SchedulePickerConfig {
  availableDays: dayOfWeek[]
  availableHours: hourOfDay[]
}

export class UserWorkSettings {
  schedule: Array<ScheduledShift> = [];
  remindShiftStart: boolean = false;
  remindShiftEnd: boolean = false;
}


export class ScheduledShiftServerModel {
  start_day_of_week: number;
  start_time_local: string;
  duration_minutes: number;

  public static toInternalModel(serverModel: ScheduledShiftServerModel): ScheduledShift {
    const internalModel = new ScheduledShift()

    internalModel.duration_minutes = serverModel.duration_minutes;
    internalModel.start_minute_of_week_local = TimeHelper.convertTimeStringToMinuteOfWeek(serverModel.start_day_of_week, serverModel.start_time_local);
    internalModel.end_minute_of_week_local = internalModel.start_minute_of_week_local + internalModel.duration_minutes;

    return internalModel;
  }
}

export class ScheduledShift {
  start_minute_of_week_local: number;
  end_minute_of_week_local: number;
  duration_minutes: number = 0;

  public static toServerModel(internalModel: ScheduledShift): ScheduledShiftServerModel {

    const serverModel = new ScheduledShiftServerModel();

    serverModel.start_day_of_week = TimeHelper.convertMinuteOfWeekToDay(internalModel.start_minute_of_week_local);
    serverModel.start_time_local = TimeHelper.convertMinuteOfWeekToTime(internalModel.start_minute_of_week_local);
    serverModel.duration_minutes = internalModel.duration_minutes;

    return serverModel;
  }
}


export interface IWorkScheduleMatrix {
  [key: string]: {
    [key: number]: boolean;
  }
}
