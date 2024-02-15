// Represents the range of values for a bin of the heatmap.
export interface IPerformanceBin {
  binId:number;
  minValue?: number;
  maxValue?: number;
  countItems: number;
}

// Represents the underlying values of a heatmap square 
// in the community insights map
export class AverageHourlyPaySummary {
  metro_area_id: number;
  for_week: string;
  day_of_week: number;
  hour_of_day: number;

  avg_hourly_pay: number;
  avg_hourly_pay_with_mileage: number;

  coverage:{
    deduction_mileage_total: number;
    earnings_total: number;
    count_employers: number;
    count_jobs: number;
    count_service_classes: number;
    count_tasks: number;
    miles_reported_total: number;
  };

  best_employer: {
    employer_id: number,
    avg_hourly_pay: number,
    avg_hourly_pay_with_mileage: number,
    count_jobs: number,
    count_tasks: number,
    count_workers: number
  };

  best_employer_with_mileage: {
    employer_id: number,
    avg_hourly_pay: number,
    avg_hourly_pay_with_mileage: number,
    count_jobs: number,
    count_tasks: number,
    count_workers: number,
  };

  perfBin?: number
}

// When a user clicks on the detail view, a collection
// of these models represent the trend over time for
// an day/hour/employer combo
export class AverageHourlyPayDetail {

  for_week:string;
  employer_id:number;
  service_class:string;
  count_jobs: number;
  count_tasks: number;
  count_workers: number;
  count_weeks: number;
  seconds_total:number;
  avg_hourly_pay: number;
  avg_hourly_pay_with_mileage: number;
  miles_reported_total: number;
  deduction_mileage_total: number;
  earnings_total: number;
}