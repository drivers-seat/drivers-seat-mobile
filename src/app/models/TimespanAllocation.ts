
export class TimespanAllocation {

  allocation_id: number;
  start_time_unix: number;
  end_time_unix: number;
  duration_seconds: number;
  activity_extends_before: boolean;
  activity_extends_after: boolean;
  activity_coverage_percent?: number;
  device_miles?: number;
  device_miles_quality_percent?: number;
  platform_miles?: number;

  activity_id?: number;
  employer?: string;
  employer_service?: string;
  service_class?: string;
  timestamp_work_start_unix?: number;
  timestamp_work_end_unix?: number;
  earnings_pay?: number;
  earnings_tip?: number;
  earnings_bonus?: number;
  earnings_total?: number;
}
