import { format, fromUnixTime, getDay, getUnixTime } from "date-fns";
import { dayOfWeek, hourOfDay } from "../models/UserPreferences";

export class TimeHelper {

  private _dayNameToNumberMatrix: { [key: string]: number };
  public get dayNameToNumberMatrix(): { [key: string]: number } {
    if (!this._dayNameToNumberMatrix) {

      this._dayNameToNumberMatrix = Object.keys(dayOfWeek)
        .filter(k => isNaN(parseInt(k)))
        .reduce((result, dayName) => {
          result[dayName] = dayOfWeek[dayName];
          return result;
        }, {});
    }

    return this._dayNameToNumberMatrix;
  }

  private _dayNumberToNameMatrix: { [key: number]: string };
  public get dayNumberToNameMatrix(): { [key: number]: string }{
    if(!this._dayNumberToNameMatrix){
      
      this._dayNumberToNameMatrix = Object.keys(dayOfWeek)
      .map(k => parseInt(k))
      .filter(k => !isNaN(k))
      .reduce((result, dayNumber) => {
        result[dayNumber] = dayOfWeek[dayNumber];
        return result
      }, {});
    }

    return this._dayNumberToNameMatrix;
  }

  private _daysOfWeek:string[];
  public get daysOfWeek(): string[]{
    if(!this._daysOfWeek) {
    this._daysOfWeek = Object.keys(dayOfWeek)
      .map(k => parseInt(k))
      .filter(k => !isNaN(k))
      .sort()
      .map(k=>dayOfWeek[k]);
    }

    return this._daysOfWeek;
  }

  public getDayNumber(date:Date){
    return getDay(date);
  }

  public static getDayNumber(date: Date) {
    return TimeHelper.Instance.getDayNumber(date);
  }

  public static get dayNameToNumberMatrix(): { [key: string]: number }{
    return TimeHelper.Instance.dayNameToNumberMatrix;
  }

  public static get dayNumberToNameMatrix(): { [key: number]: string }{
    return TimeHelper.Instance.dayNumberToNameMatrix;
  }

  public static get daysOfWeek(): string[]{
    return TimeHelper.Instance.daysOfWeek;
  }
  
  private static readonly _instance = new TimeHelper();
  public static get Instance():TimeHelper{
    return TimeHelper._instance;
  }

  public static convertMinuteOfWeekToTime(minute_of_week: number): string {

    const minuteOfDay = minute_of_week % 1440;
    const hourOfDay = Math.floor(minuteOfDay / 60);
    const minuteOfHour = minuteOfDay % 60;

    const time = `${String(hourOfDay).padStart(2, '0')}:${String(minuteOfHour).padStart(2, '0')}:00`;

    return time;
  }

  public static convertHourOfDayToTime(hour_of_day: hourOfDay): string {
    const time = `${String(hour_of_day).padStart(2, '0')}:00:00`;
    return time;
  }

  public static convertMinuteOfWeekToDay(minute_of_week: number): number {

    return Math.floor(minute_of_week / 1440);
  }

  public static convertTimeStringToMinuteOfWeek(dayOfWeek: number, timeOfDay: string): number {

    const timeComponentVals = timeOfDay.split(":").map(x => parseInt(x));

    return (dayOfWeek * 1440) + (timeComponentVals[0] * 60) + timeComponentVals[1];
  }

  public static getHourOfDayFromTimeString(timeOfDay: string): number {
    return parseInt(timeOfDay.split(":")[0]);
  }

  public static getHourDisplayName(hour: hourOfDay) {
    const val = hour % 12 == 0 ? 12 : hour % 12;
    return `${val}${hour >= 12 ? 'pm' : 'am'}`;
  }

  public static convertToHMSArray(value: number): string[] {
    let sec = value; // convert value to number if it's string
    let hours = Math.floor(sec / 3600); // get hours
    let minutes = Math.floor((sec - (hours * 3600)) / 60); // get minutes
    let seconds = sec - (hours * 3600) - (minutes * 60); //  get seconds
    let ret: string[] = [];
    ret.push(String(hours));
    ret.push(String(minutes));
    return ret;
  }

  public toShortDate(date: Date, includeYear: boolean = false): string {
    return TimeHelper.toShortDate(date, includeYear);
  }

  public toShortDateUnix(unixDate: number, includeYear:boolean = false): string {
    return TimeHelper.toShortDateUnix(unixDate, includeYear);
  }


  public toLongDate(date: Date): string {
    return TimeHelper.toLongDate(date);
  }

  public toLongDateUnix(unixDate: number): string {
    return TimeHelper.toLongDateUnix(unixDate);
  }


  public toShortTime(date: Date): string {
    return TimeHelper.toShortTime(date);
  }

  public toShortTimeUnix(unixDate: number): string {
    return TimeHelper.toShortTimeUnix(unixDate);
  }

  public getDurationFromDates(start_time: Date, end_time: Date, short: boolean = true, include_minutes: boolean = true): string {
    return TimeHelper.getDurationFromDates(start_time, end_time, short, include_minutes);
  }

  public getDurationFromUnixTimes(start_time_unix: number, end_time_unix: number, short: boolean = true, include_minutes: boolean = true): string {
    return TimeHelper.getDurationFromUnixTimes(start_time_unix, end_time_unix, short, include_minutes);
  }

  public getDurationFromMinutes(minutes_total: number, short: boolean = true, include_minutes: boolean = true): string {
    return TimeHelper.getDurationFromMinutes(minutes_total, short, include_minutes);
  }

  public getDurationFromSeconds(duration_seconds_total: number, short: boolean = true, include_minutes: boolean = true): string {
    return TimeHelper.getDurationFromSeconds(duration_seconds_total, short, include_minutes);
  }


  public static toShortDate(date: Date, includeYear: boolean = false): string {
    return includeYear
      ? this.formatFromDate(date, "M/d/yyyy")
      : this.formatFromDate(date, "M/d");
  }

  public static toShortDateUnix(unixDate: number, includeYear: boolean = false): string {
      return this.toShortDate(fromUnixTime(unixDate), includeYear)
  }

  public static toLongDate(date: Date): string {
    return this.formatFromDate(date, "EEEE, MMMM do, yyyy");
  }

  public static toLongDateUnix(unixDate: number): string {
    return this.formatFromUnixTime(unixDate, "EEEE, MMMM do, yyyy");
  }

  public static toShortTime(date: Date): string {
    return this.formatFromDate(date, "h:mm a");
  }

  public static toShortTimeUnix(unixDate: number): string {
    return this.formatFromUnixTime(unixDate, "h:mm a");
  }

  private static formatFromUnixTime(unixDate: number, template: string = "M/d"): string {

    if (!unixDate) {
      return null;
    }

    const dtm = fromUnixTime(unixDate);

    return this.formatFromDate(dtm, template);

  }

  private static formatFromDate(dtm: Date, template: string = "M/d"): string {

    if (!dtm) {
      return null;
    }

    return format(dtm, template);
  }

  public static getDurationFromDates(start_time: Date, end_time: Date, short: boolean = true, include_minutes: boolean = true): string {

    if (!start_time || !end_time) {
      return null;
    }

    const start_time_unix = getUnixTime(start_time);
    const end_time_unix = getUnixTime(start_time);

    return TimeHelper.getDurationFromUnixTimes(start_time_unix, end_time_unix, short, include_minutes);
  }

  public static getDurationFromUnixTimes(start_time_unix: number, end_time_unix: number, short: boolean = true, include_minutes: boolean = true): string {

    if (!start_time_unix || !end_time_unix) {
      return null;
    }

    const duration_seconds_total = end_time_unix - start_time_unix;

    return TimeHelper.getDurationFromSeconds(duration_seconds_total, short, include_minutes);
  }

  public static getDurationFromMinutes(minutes_total: number, short: boolean = true, include_minutes: boolean = true): string {
    return TimeHelper.getDurationFromSeconds((minutes_total || 0) * 60, short, include_minutes);
  }

  public static getDurationFromSeconds(duration_seconds_total: number, short: boolean = true, include_minutes: boolean = true): string {

    duration_seconds_total = duration_seconds_total || 0;

    let hours = Math.floor(duration_seconds_total / 3600);
    const minutes = Math.floor((duration_seconds_total % 3600) / 60);
    const seconds = duration_seconds_total % 60;

    if(!include_minutes && minutes > 30){
      hours++;
    }

    const hrName = short ? "h" : " hour"
    const minName = short ? "m" : " minute"
    const secName = short ? "s" : " second"

    if (hours == 0 && minutes == 0 && seconds == 0) {
      return "-";
    }

    const tokens: string[] = [];

    if (hours > 0) {
      tokens.push(`${hours}${hrName}${!short && hours > 1 ? "s" : ""}`);
    }

    if (include_minutes) {
      if (minutes > 0) {
        tokens.push(`${minutes}${minName}${!short && minutes > 1 ? "s" : ""}`);
      }

      if (hours == 0 && minutes == 0) {
        tokens.push(`${seconds}${secName}${!short && seconds > 1 ? "s" : ""}`);
      }
    }

    return tokens.join(" ");
  }
}