// Represents a gig activity/job for a worker
// Activities can encompass multiple jobs on some platforms (see tasks_total)
export class Activity {
  activity_id: number;
  activity_key: string;
  employer?: string;
  employer_service?: string;
  service_class?: string;
  earning_type?: string;
  working_day_start?: Date;
  working_day_end?: Date;
  timestamp_work_start_unix?: number;
  timestamp_work_end_unix?: number;
  timestamp_start_unix?: number;
  timestamp_end_unix?: number;
  timestamp_request_unix?: number;
  timestamp_accept_unix?: number;
  timestamp_cancel_unix?: number;
  timestamp_pickup_unix?: number;
  timestamp_dropoff_unix?: number;
  timestamp_shift_start_unix?: number;
  timestamp_shift_end_unix?: number;
  is_pool?: boolean;
  is_rush?: boolean;
  is_surge?: boolean;
  income_rate_hour?: number;
  income_rate_mile?: number;
  distance_reported?: number;
  distance_reported_unit?: string;
  duration_reported_seconds?: number;
  timezone?: string;
  charges_fees?: number;
  charges_taxes?: number;
  charges_total?: number;
  tasks_total?: number;
  earnings_pay?: number;
  earnings_tip?: number;
  earnings_bonus?: number;
  earnings_total?: number;
}
