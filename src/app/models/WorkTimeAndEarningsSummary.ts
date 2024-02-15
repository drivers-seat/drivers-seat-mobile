import { StatsWindow } from "./PerformanceStatistic";


export class WorkTimeAndEarningsSummary {

  window: StatsWindow;

  count_work_days?: number;
  duration_seconds?: number;
  duration_seconds_engaged?: number;

  public get duration_seconds_not_engaged(): number {
    return (this.duration_seconds || 0) == 0
      ? 0
      : (this.duration_seconds || 0) - (this.duration_seconds_engaged || 0);
  }

  public get earnings_pay(): number {
    return (this.job_earnings_pay || 0) + (this.other_earnings_pay || 0);
  }

  public get earnings_tip(): number {
    return (this.job_earnings_tip || 0) + (this.other_earnings_tip || 0);
  }

  public get earnings_bonus(): number {
    return (this.job_earnings_bonus || 0) + (this.other_earnings_bonus || 0);
  }

  public get earnings_total(): number {
    return (this.job_earnings_total || 0) + (this.other_earnings_total || 0);
  }

  public get device_miles_not_engaged(): number {
    return (this.device_miles || 0) == 0
      ? 0
      : (this.device_miles || 0) - (this.device_miles_engaged || 0);
  }

  public get platform_miles_not_engaged(): number {
    return (this.platform_miles || 0) == 0
      ? 0
      : (this.platform_miles || 0) - (this.platform_miles_engaged || 0);
  }

  public get selected_miles_not_engaged(): number {
    return (this.selected_miles || 0) == 0
      ? 0
      : (this.selected_miles || 0) - (this.selected_miles_engaged || 0);
  }

  public get device_miles_deduction_not_engaged(): number {
    return (this.device_miles_deduction || 0) == 0
      ? 0
      : (this.device_miles_deduction || 0) - (this.device_miles_deduction_engaged || 0);
  }

  public get platform_miles_deduction_not_engaged(): number {
    return (this.platform_miles_deduction || 0) == 0
      ? 0
      : (this.platform_miles_deduction || 0) - (this.platform_miles_deduction_engaged || 0);
  }

  public get selected_miles_deduction_not_engaged(): number {
    return (this.selected_miles_deduction || 0) == 0
      ? 0
      : (this.selected_miles_deduction || 0) - (this.selected_miles_deduction_engaged || 0);
  }


  job_count?: number;
  job_count_days?: number;
  job_count_tasks?: number;
  job_earnings_bonus?: number;
  job_earnings_pay?: number;
  job_earnings_tip?: number;
  job_earnings_total?: number;

  other_count_activities?: number;
  other_count_days?: number;
  other_earnings_bonus?: number;
  other_earnings_pay?: number;
  other_earnings_tip?: number;
  other_earnings_total?: number;

  device_miles?: number;
  device_miles_engaged?: number;
  device_miles_deduction?: number;
  device_miles_deduction_engaged?: number;

  platform_miles?: number;
  platform_miles_engaged?: number;
  platform_miles_deduction?: number;
  platform_miles_deduction_engaged?: number;

  selected_miles?: number;
  selected_miles_engaged?: number;
  selected_miles_deduction?: number;
  selected_miles_deduction_engaged?: number;
}
