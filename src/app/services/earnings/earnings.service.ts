import { Injectable } from '@angular/core';
import { Timespan } from 'src/app/models/Timespan';
import { TimespanAllocation } from "src/app/models/TimespanAllocation";
import { WorkTimeAndEarningsSummary } from "src/app/models/WorkTimeAndEarningsSummary";
import { ApiService } from '../api.service';
import { ILogService } from '../logging/log.service';
import { Logger } from '../logging/logger';
import { Cache } from '../../models/CacheItem';
import { UserService } from '../user.service';
import { User } from 'src/app/models/User';
import { format, fromUnixTime, getUnixTime, parse } from 'date-fns';
import { HttpClient } from '@angular/common/http';
import { StatSummaryLevel, StatsWindow } from 'src/app/models/PerformanceStatistic';
import { StatsService } from '../stats/stats.service';
import { Activity } from 'src/app/models/Activity';
import { Shift } from 'src/app/models/Shift';
import { UserTrackingService } from '../user-tracking/user-tracking.service';
import { TrackedEvent } from 'src/app/models/TrackedEvent';
import { IGoalTrackingService } from '../goal-tracking/goal-tracking.service';

export abstract class IEarningsService {
  public abstract get_timespans_for_workday(work_date: Date): Promise<{ work_date: Date, timespans: Timespan[] }>;
  public abstract get_work_time_and_earnings_summary_breakdown(window: StatsWindow): Promise<{ window: StatsWindow, summaries: WorkTimeAndEarningsSummary[] }>;
  public abstract get_work_time_and_earnings_summary(window: StatsWindow): Promise<{ window: StatsWindow, summary: WorkTimeAndEarningsSummary }>;
  public abstract get_activity(activity_id: number): Promise<{ activity_id: number, activity: Activity }>;
  public abstract get_activities_for_workday(work_date: Date): Promise<{ work_date: Date, activities: Activity[] }>;
  public abstract update_working_times(work_date: Date, new_shifts: Shift[]): Promise<void>;
  public abstract export(window: StatsWindow, include_non_engaged_time: boolean, groupings: Array<'employer' | 'year' | 'quarter' | 'month' | 'week' | 'day'>): Promise<void>
  public abstract reset();
}


@Injectable({
  providedIn: 'root'
})
export class EarningsService implements IEarningsService {

  private readonly _cache_expiration_seconds = 600;

  private readonly _logger: Logger;
  private readonly _timespan_cache: Cache<Timespan[]>;
  private readonly _earnings_time_breakdown_cache: Cache<WorkTimeAndEarningsSummary[]>;
  private readonly _earnings_summary_cache: Cache<WorkTimeAndEarningsSummary>;
  private readonly _activity_cache: Cache<Activity>;
  private readonly _activities_day_cache: Cache<Activity[]>;

  private _user: User;

  constructor(
    logSvc: ILogService,
    private readonly _apiSvc: ApiService,
    private readonly _userSvc: UserService,
    private readonly _httpSvc: HttpClient,
    private readonly _statsSvc: StatsService,
    private readonly _userTrackingSvc: UserTrackingService,
    private readonly _goalSvc: IGoalTrackingService
  ) {

    this._logger = logSvc.getLogger("EarningsService");
    this._timespan_cache = new Cache<Timespan[]>("Timespans", this._cache_expiration_seconds, logSvc);
    this._earnings_time_breakdown_cache = new Cache<WorkTimeAndEarningsSummary[]>("Earnings Time Breakdowns", this._cache_expiration_seconds, logSvc);
    this._earnings_summary_cache = new Cache<WorkTimeAndEarningsSummary>("Earnings Breakdowns", this._cache_expiration_seconds, logSvc);
    this._activity_cache = new Cache<Activity>("Activity", this._cache_expiration_seconds, logSvc);
    this._activities_day_cache = new Cache<Activity[]>("Activities for Workday", this._cache_expiration_seconds, logSvc);

    // Clear out cache when user changes
    this._userSvc.currentUser$.subscribe(u => {
      if (u?.id != this._user?.id) {
        this.reset();
      }
      this._user = u;
    });

    this._statsSvc.statsChanged$.subscribe(r => {
      this._logger.LogInfo("StatsChanged$", r)
    })
  }

  public reset() {
    this._timespan_cache.clear();
    this._earnings_time_breakdown_cache.clear();
    this._earnings_summary_cache.clear();
    this._activity_cache.clear();
    this._activities_day_cache.clear();
  }

  public async get_timespans_for_workday(work_date: Date): Promise<{ work_date: Date, timespans: Timespan[] }> {

    const dtmFmt = format(work_date, "yyyy-MM-dd");

    const timespans = await this._timespan_cache.getItem(dtmFmt, async k => {
      const url = `${this._apiSvc.url()}/earnings/work_time/${k}`;
      const data = await this._httpSvc.get(url).toPromise();
      const timespans = data["data"]

      return timespans
        ? timespans.map(ts => this.parseTimespan(ts))
        : []
    });

    return {
      work_date: work_date,
      timespans: timespans
        .sort((a, b) => a.start_time_unix - b.start_time_unix)
    };
  }

  public async get_work_time_and_earnings_summary(window: StatsWindow): Promise<{ window: StatsWindow, summary: WorkTimeAndEarningsSummary }> {

    const summary = await this._earnings_summary_cache.getItem(window.key, async k => {

      const work_date_start_fmt = format(window.startRange, "yyyy-MM-dd");
      const work_date_end_fmt = format(window.endRange, "yyyy-MM-dd");

      const url = `${this._apiSvc.url()}/earnings/work_time?work_date_start=${work_date_start_fmt}&work_date_end=${work_date_end_fmt}`;
      const data = await this._httpSvc.get(url).toPromise();

      return this.parseEarningsSummarySummaryItem(data["data"] || {}, window);
    });

    return {
      window: window,
      summary: summary
    };
  }

  public async get_work_time_and_earnings_summary_breakdown(window: StatsWindow): Promise<{ window: StatsWindow, summaries: WorkTimeAndEarningsSummary[] }> {

    const summaries = await this._earnings_time_breakdown_cache.getItem(window.key, async k => {

      const work_date_start_fmt = format(window.startRange, "yyyy-MM-dd");
      const work_date_end_fmt = format(window.endRange, "yyyy-MM-dd");
      let childSummaryLevel = this._statsSvc.getChildSummaryLevel(window.summaryLevel);

      const url = `${this._apiSvc.url()}/earnings/work_time?work_date_start=${work_date_start_fmt}&work_date_end=${work_date_end_fmt}&time_grouping=${childSummaryLevel}`;
      const data = await this._httpSvc.get(url).toPromise();

      let summaries = data["data"];

      return summaries
        ? summaries.map(x => this.parseEarningsSummaryBreakdownItem(x, childSummaryLevel, window))
        : [];
    });

    return {
      window: window,
      summaries: summaries
    };
  }

  public async get_activities_for_workday(work_date: Date): Promise<{ work_date: Date, activities: Activity[] }> {

    const dtmFmt = format(work_date, "yyyy-MM-dd");

    const activities = await this._activities_day_cache.getItem(dtmFmt, async k => {

      const url = `${this._apiSvc.url()}/earnings/activities?work_date_start=${k}&work_date_end=${k}`;
      const data = await this._httpSvc.get(url).toPromise();

      let items = data["data"];

      return items
        ? items.map(x => this.parseActivity(x))
        : [];
    });

    //Set the item level cache here since the items are available
    activities.forEach(a => this._activity_cache.setItem(`${a.activity_id}`, a));

    return {
      work_date: work_date,
      activities: activities
    };
  }

  public async get_activity(activity_id: number): Promise<{ activity_id: number, activity: Activity }> {

    const activity = await this._activity_cache.getItem(`${activity_id}`, async k => {

      const url = `${this._apiSvc.url()}/earnings/activities/${k}`;
      const data = await this._httpSvc.get(url).toPromise();

      let activity = data["data"];

      return activity
        ? this.parseActivity(activity)
        : null;
    });

    return {
      activity_id: activity_id,
      activity: activity
    };
  }

  public async update_working_times(work_date: Date, new_shifts: Shift[]): Promise<void> {

    if (this._apiSvc.isGhosting) {
      this._logger.LogInfo("update_working_times", "Ignoring request because ghosting in progress");
      return;
    }

    const dtmFmt = format(work_date, "yyyy-MM-dd");

    const url = `${this._apiSvc.url()}/shift/update_working_time/${dtmFmt}`;

    const post_data = {
      new_shifts: new_shifts
    }

    await this._httpSvc.post(url, post_data).toPromise();

    this._statsSvc.reset();
    this._goalSvc.reset();
    this.reset();
  }

  public async export(window: StatsWindow, include_non_engaged_time: boolean, groupings: Array<'employer' | 'year' | 'quarter' | 'month' | 'week' | 'day'>) {

    const postModel = {
      query: {
        date_start: window.startRange,
        date_end: window.endRange,
        include_non_p3_time: include_non_engaged_time || false,
        groupings: groupings
      }
    };

    const eventModel = {
      window: window.title,
      date_start: window.startRange,
      date_end: window.endRange,
      include_non_engaged_time: include_non_engaged_time
    };

    if (groupings && groupings.length > 0) {
      eventModel["groupings"] = groupings.join(", ");
    }

    const url = `${this._apiSvc.url()}/earnings/export`;

    await this._httpSvc.post(url, postModel).toPromise()
      .then(x => {
        this._logger.LogInfo(x);
        this._userTrackingSvc.captureEvent(TrackedEvent.Export_Earnings, eventModel);
      });
  }

  private parseTimespan(data: any): Timespan {

    const timespan = new Timespan();

    timespan.timespan_id = data["timespan_id"];
    timespan.work_date_label = data["work_date"];
    timespan.start_time_unix = getUnixTime(new Date(data["start_time"]));
    timespan.end_time_unix = getUnixTime(new Date(data["end_time"]));
    timespan.shift_ids = data["shift_ids"];
    timespan.duration_seconds = data["duration_seconds"];
    timespan.duration_seconds_engaged = data["duration_seconds_engaged"];
    timespan.duration_seconds_not_engaged = data["duration_seconds_not_engaged"];

    if (data["selected_miles_quality_percent"]) {

      timespan.selected_miles_quality_percent = parseFloat(data["selected_miles_quality_percent"]);

      if (data["selected_miles"]) {
        timespan.selected_miles = parseFloat(data["selected_miles"]);
      }

      if (data["selected_miles_engaged"]) {
        timespan.selected_miles_engaged = parseFloat(data["selected_miles_engaged"]);
      }

      if (data["selected_miles_not_engaged"]) {
        timespan.selected_miles_not_engaged = parseFloat(data["selected_miles_not_engaged"]);
      }

      if (data["selected_miles_deduction_cents"]) {
        timespan.selected_miles_deduction = data["selected_miles_deduction_cents"] / 100;
      }

      if (data["selected_miles_deduction_cents_engaged"]) {
        timespan.selected_miles_deduction_engaged = data["selected_miles_deduction_cents_engaged"] / 100;
      }

      if (data["selected_miles_deduction_cents_not_engaged"]) {
        timespan.selected_miles_deduction_not_engaged = data["selected_miles_deduction_cents_not_engaged"] / 100;
      }
    }

    if (data["device_miles_quality_percent"]) {

      timespan.device_miles_quality_percent = parseFloat(data["device_miles_quality_percent"]);


      if (data["device_miles"]) {
        timespan.device_miles = parseFloat(data["device_miles"]);
      }

      if (data["device_miles_engaged"]) {
        timespan.device_miles = parseFloat(data["device_miles_engaged"]);
      }

      if (data["device_miles_not_engaged"]) {
        timespan.device_miles = parseFloat(data["device_miles_not_engaged"]);
      }

      if (data["device_miles_deduction_cents"]) {
        timespan.device_miles_deduction = data["device_miles_deduction_cents"] / 100;
      }

      if (data["device_miles_deduction_cents_engaged"]) {
        timespan.device_miles_deduction_engaged = data["device_miles_deduction_cents_engaged"] / 100;
      }

      if (data["device_miles_deduction_cents_not_engaged"]) {
        timespan.device_miles_deduction_not_engaged = data["device_miles_deduction_cents_not_engaged"] / 100;
      }
    }

    if (data["platform_miles_quality_percent"]) {

      timespan.platform_miles_quality_percent = parseFloat(data["platform_miles_quality_percent"]);


      if (data["platform_miles"]) {
        timespan.platform_miles = parseFloat(data["platform_miles"]);
      }

      if (data["platform_miles_engaged"]) {
        timespan.platform_miles = parseFloat(data["platform_miles_engaged"]);
      }

      if (data["platform_miles_not_engaged"]) {
        timespan.platform_miles = parseFloat(data["platform_miles_not_engaged"]);
      }

      if (data["platform_miles_deduction_cents"]) {
        timespan.platform_miles_deduction = data["platform_miles_deduction_cents"] / 100;
      }

      if (data["platform_miles_deduction_cents_engaged"]) {
        timespan.platform_miles_deduction_engaged = data["platform_miles_deduction_cents_engaged"] / 100;
      }

      if (data["platform_miles_deduction_cents_not_engaged"]) {
        timespan.platform_miles_deduction_not_engaged = data["platform_miles_deduction_cents_not_engaged"] / 100;
      }
    }

    if (data["allocations"]) {
      timespan.allocations = data["allocations"].map(x => {
        return this.parseTimespanAllocation(x)
      });
    }

    return timespan;
  }

  private parseTimespanAllocation(data: any): TimespanAllocation {

    const allocation = new TimespanAllocation();

    allocation.allocation_id = data["allocation_id"];
    allocation.start_time_unix = getUnixTime(new Date(data["start_time"]));
    allocation.end_time_unix = getUnixTime(new Date(data["end_time"]));

    allocation.duration_seconds = data["duration_seconds"];
    allocation.activity_extends_before = data["activity_extends_before"];
    allocation.activity_extends_after = data["activity_extends_after"];

    if (data["activity_coverage_percent"]) {
      allocation.activity_coverage_percent = parseFloat(data["activity_coverage_percent"]);
    }

    if (data["device_miles"]) {
      allocation.device_miles = parseFloat(data["device_miles"]);
    }

    if (data["device_miles_quality_percent"]) {
      allocation.device_miles_quality_percent = parseFloat(data["device_miles_quality_percent"]);
    }

    if (data["platform_miles"]) {
      allocation.device_miles = parseFloat(data["platform_miles"]);
    }

    allocation.activity_id = data["activity_id"];
    allocation.employer = data["employer"];
    allocation.employer_service = data["employer_service"];
    allocation.service_class = data["service_class"];

    if (data["timestamp_work_start"]) {
      allocation.timestamp_work_start_unix = getUnixTime(new Date(data["timestamp_work_start"]));
    }

    if (data["timestamp_work_end"]) {
      allocation.timestamp_work_end_unix = getUnixTime(new Date(data["timestamp_work_end"]));
    }

    if (data["earnings_pay_cents"]) {
      allocation.earnings_pay = data["earnings_pay_cents"] / 100;
    }

    if (data["earnings_tip_cents"]) {
      allocation.earnings_tip = data["earnings_tip_cents"] / 100;
    }

    if (data["earnings_bonus_cents"]) {
      allocation.earnings_bonus = data["earnings_bonus_cents"] / 100;
    }

    if (data["earnings_total_cents"]) {
      allocation.earnings_total = data["earnings_total_cents"] / 100;
    }

    return allocation;
  }

  private parseEarningsSummarySummaryItem(data: any, window: StatsWindow): WorkTimeAndEarningsSummary {

    const summary = this.parseEarningsSummaryBase(data);
    summary.window = window;

    return summary;
  }

  private parseEarningsSummaryBreakdownItem(data: any, summaryLevel: StatSummaryLevel, parentWindow: StatsWindow): WorkTimeAndEarningsSummary {

    const summary = this.parseEarningsSummaryBase(data);

    let date: Date;
    if (data["day"]) {
      date = parse(data["day"], 'yyyy-MM-dd', new Date())
    }

    if (data["week"]) {
      date = parse(data["week"], 'yyyy-MM-dd', new Date())
    }

    if (data["month"]) {
      date = parse(data["month"], 'yyyy-MM-dd', new Date())
    }

    if (data["year"]) {
      date = parse(data["year"], 'yyyy-MM-dd', new Date())
    }

    const window = this._statsSvc.getStatsWindowForDate(date, summaryLevel);
    if (window.startRange >= parentWindow.startRange && window.endRange <= parentWindow.endRange) {
      summary.window = window;
    } else {
      const startRange = window.startRange < parentWindow.startRange ? parentWindow.startRange : window.startRange;
      const endRange = window.endRange > parentWindow.endRange ? parentWindow.endRange : window.endRange;
      summary.window = this._statsSvc.getStatsWindow(startRange, endRange, summaryLevel);
    }

    return summary;
  }

  private parseEarningsSummaryBase(data: any): WorkTimeAndEarningsSummary {
    const summary = new WorkTimeAndEarningsSummary();

    summary.count_work_days = data["count_work_days"]
    summary.duration_seconds = data["duration_seconds"]
    summary.duration_seconds_engaged = data["duration_seconds_engaged"]
    summary.job_count = data["job_count"]
    summary.job_count_days = data["job_count_days"]
    summary.job_count_tasks = data["job_count_tasks"]

    if (data["job_earnings_bonus_cents"]) {
      summary.job_earnings_bonus = data["job_earnings_bonus_cents"] / 100;
    }

    if (data["job_earnings_pay_cents"]) {
      summary.job_earnings_pay = data["job_earnings_pay_cents"] / 100;
    }

    if (data["job_earnings_tip_cents"]) {
      summary.job_earnings_tip = data["job_earnings_tip_cents"] / 100;
    }

    if (data["job_earnings_total_cents"]) {
      summary.job_earnings_total = data["job_earnings_total_cents"] / 100;
    }

    summary.other_count_activities = data["other_count_activities"]
    summary.other_count_days = data["other_count_days"]

    if (data["other_earnings_bonus_cents"]) {
      summary.other_earnings_bonus = data["other_earnings_bonus_cents"] / 100;
    }

    if (data["other_earnings_pay_cents"]) {
      summary.other_earnings_pay = data["other_earnings_pay_cents"] / 100;
    }

    if (data["other_earnings_tip_cents"]) {
      summary.other_earnings_tip = data["other_earnings_tip_cents"] / 100;
    }

    if (data["other_earnings_total_cents"]) {
      summary.other_earnings_total = data["other_earnings_total_cents"] / 100;
    }

    if (data["device_miles"]) {
      summary.device_miles = parseFloat(data["device_miles"]);
    }

    if (data["device_miles_engaged"]) {
      summary.device_miles_engaged = parseFloat(data["device_miles_engaged"]);
    }

    if (data["device_miles_deduction_cents"]) {
      summary.device_miles_deduction = data["device_miles_deduction_cents"] / 100;
    }

    if (data["device_miles_deduction_cents_engaged"]) {
      summary.device_miles_deduction_engaged = data["device_miles_deduction_cents_engaged"] / 100;
    }

    if (data["platform_miles"]) {
      summary.platform_miles = parseFloat(data["platform_miles"]);
    }

    if (data["platform_miles_engaged"]) {
      summary.platform_miles_engaged = parseFloat(data["platform_miles_engaged"]);
    }

    if (data["platform_miles_deduction_cents"]) {
      summary.platform_miles_deduction = data["platform_miles_deduction_cents"] / 100;
    }

    if (data["platform_miles_deduction_cents_engaged"]) {
      summary.platform_miles_deduction_engaged = data["platform_miles_deduction_cents_engaged"] / 100;
    }

    if (data["selected_miles"]) {
      summary.selected_miles = parseFloat(data["selected_miles"]);
    }

    if (data["selected_miles_engaged"]) {
      summary.selected_miles_engaged = parseFloat(data["selected_miles_engaged"]);
    }

    if (data["selected_miles_deduction_cents"]) {
      summary.selected_miles_deduction = data["selected_miles_deduction_cents"] / 100;
    }

    if (data["selected_miles_deduction_cents_engaged"]) {
      summary.selected_miles_deduction_engaged = data["selected_miles_deduction_cents_engaged"] / 100;
    }

    return summary;
  }

  private parseActivity(data: any): Activity {
    const activity = new Activity();

    activity.activity_id = data["activity_id"];
    activity.activity_key = data["activity_key"];
    activity.employer = data["employer"];
    activity.employer_service = data["employer_service"];
    activity.service_class = data["service_class"];
    activity.earning_type = data["earning_type"];

    if (data["working_day_start"]) {
      activity.working_day_start = parse(data["working_day_start"], 'yyyy-MM-dd', new Date());
    }

    if (data["working_day_end"]) {
      activity.working_day_end = parse(data["working_day_end"], 'yyyy-MM-dd', new Date());
    }

    if (data["timestamp_work_start"]) {
      activity.timestamp_work_start_unix = getUnixTime(new Date(data["timestamp_work_start"]));
    }

    if (data["timestamp_work_end"]) {
      activity.timestamp_work_end_unix = getUnixTime(new Date(data["timestamp_work_end"]));
    }

    if (data["timestamp_start"]) {
      activity.timestamp_start_unix = getUnixTime(new Date(data["timestamp_start"]));
    }

    if (data["timestamp_end"]) {
      activity.timestamp_end_unix = getUnixTime(new Date(data["timestamp_end"]));
    }

    if (data["timestamp_request"]) {
      activity.timestamp_request_unix = getUnixTime(new Date(data["timestamp_request"]));
    }

    if (data["timestamp_accept"]) {
      activity.timestamp_accept_unix = getUnixTime(new Date(data["timestamp_accept"]));
    }

    if (data["timestamp_cancel"]) {
      activity.timestamp_cancel_unix = getUnixTime(new Date(data["timestamp_cancel"]));
    }

    if (data["timestamp_pickup"]) {
      activity.timestamp_pickup_unix = getUnixTime(new Date(data["timestamp_pickup"]));
    }

    if (data["timestamp_dropoff"]) {
      activity.timestamp_dropoff_unix = getUnixTime(new Date(data["timestamp_dropoff"]));
    }

    if (data["timestamp_shift_start"]) {
      activity.timestamp_shift_start_unix = getUnixTime(new Date(data["timestamp_shift_start"]));
    }

    if (data["timestamp_shift_end"]) {
      activity.timestamp_shift_end_unix = getUnixTime(new Date(data["timestamp_shift_end"]));
    }

    activity.is_pool = data["is_pool"] || false;
    activity.is_rush = data["is_rush"] || false;
    activity.is_surge = data["is_surge"] || false;

    if (data["income_rate_hour_cents"]) {
      activity.income_rate_hour = data["income_rate_hour_cents"] / 100;
    }

    if (data["income_rate_mile_cents"]) {
      activity.income_rate_mile = data["income_rate_mile_cents"] / 100;
    }

    activity.distance_reported = data["distance_reported"];
    activity.distance_reported_unit = data["distance_reported_unit"]
    activity.duration_reported_seconds = data["duration_reported_seconds"];
    activity.timezone = data["timezone"];
    activity.tasks_total = data["tasks_total"];

    if (data["charges_fees_cents"]) {
      activity.charges_fees = data["charges_fees_cents"] / 100;
    }

    if (data["charges_taxes_cents"]) {
      activity.charges_taxes = data["charges_taxes_cents"] / 100;
    }

    if (data["charges_total_cents"]) {
      activity.charges_total = data["charges_total_cents"] / 100;
    }



    if (data["earnings_pay_cents"]) {
      activity.earnings_pay = data["earnings_pay_cents"] / 100;
    }

    if (data["earnings_tip_cents"]) {
      activity.earnings_tip = data["earnings_tip_cents"] / 100;
    }

    if (data["earnings_bonus_cents"]) {
      activity.earnings_bonus = data["earnings_bonus_cents"] / 100;
    }

    if (data["earnings_total_cents"]) {
      activity.earnings_total = data["earnings_total_cents"] / 100;
    }

    return activity;
  }
}
