import { TimespanAllocation } from "./TimespanAllocation";

export class Timespan {
  timespan_id: number;
  start_time_unix: number;
  end_time_unix: number;
  work_date_label: number;
  shift_ids: number[];
  duration_seconds: number;
  duration_seconds_engaged: number;
  duration_seconds_not_engaged: number;

  selected_miles_quality_percent?: number;
  selected_miles?: number;
  selected_miles_engaged?: number;
  selected_miles_not_engaged?: number;
  selected_miles_deduction?: number;
  selected_miles_deduction_engaged?: number;
  selected_miles_deduction_not_engaged?: number;

  device_miles_quality_percent?: number;
  device_miles?: number;
  device_miles_engaged?: number;
  device_miles_not_engaged?: number;
  device_miles_deduction?: number;
  device_miles_deduction_engaged?: number;
  device_miles_deduction_not_engaged?: number;

  platform_miles_quality_percent?: number;
  platform_miles?: number;
  platform_miles_engaged?: number;
  platform_miles_not_engaged?: number;
  platform_miles_deduction?: number;
  platform_miles_deduction_engaged?: number;
  platform_miles_deduction_not_engaged?: number;

  allocations: TimespanAllocation[];
}


