import { getUnixTime } from "date-fns";

export enum StatSummaryLevel {

  day = 'day',
  week = 'week',
  month = 'month',
  year = 'year',
  custom = 'custom'
};

export class StatsWindow {
  public get key(): string{
    return `${getUnixTime(this.startRange)}:${getUnixTime(this.endRange)}`;
  }
  summaryLevel: StatSummaryLevel;
  startRange: Date;
  endRange: Date;
  title: string;

  title1: string;
  title2: string

}


export class StatsCompareModel {
  current?: PerformanceStatistic;
  prev?: PerformanceStatistic;
  comparison?: PerformanceStatistic;
};


export class PerformanceStatistic {

  window: StatsWindow;

  totalPayGross: number = 0;
  totalPayNet: number = 0;

  hourlyPayNet: number = 0;
  hourlyPayGross: number;

  expensesDeductible: number = 0;
  expensesMileage: number = 0;

  jobs: number = 0;
  miles: number = 0;

  drivingTotalSeconds: number = 0;
  drivingSeconds: number = 0;
  drivingHours: number = 0;
  drivingMinutes: number = 0;

  drivingPaidTotalSeconds: number = 0; 
  drivingPaidSeconds: number = 0;
  drivingPaidHours: number = 0;
  drivingPaidMinutes: number = 0;

  unpaidTotalSeconds: number = 0;
  unpaidSeconds: number = 0;
  unpaidHours: number = 0;
  unpaidMinutes: number = 0;

  paidTimePercent: number = 0;

  earningsPerMile?: number = 0;

  employerStats: Array<EmployerPerformanceStatistic>;
  

  get hasNoData(): boolean {
    return this.hasNoWorkData &&
      (this.totalPayGross || 0) == 0 &&
      (this.expensesDeductible || 0) == 0;
  }

  get hasNoJobs(): boolean {
    return (this.jobs || 0) == 0;
  }

  get hasNoWorkData(): boolean {
    return this.hasNoJobs &&
      (this.drivingTotalSeconds || 0) == 0 &&
      (this.miles || 0) == 0;
  }

  get hasActivity(): boolean {
    return (this.totalPayGross || 0) != 0 ||
      (this.drivingTotalSeconds || 0) != 0
  }

  public static parse(apiResult: any, window: StatsWindow): PerformanceStatistic {

    let result = new PerformanceStatistic();

    result.window = window;

    result.totalPayGross = apiResult.cents_earnings_gross / 100;
    result.totalPayNet = (apiResult.cents_earnings_gross - apiResult.cents_expenses_mileage) / 100;
    // apiResult.cents_earnings_net / 100;

    result.expensesMileage = apiResult.cents_expenses_mileage / 100;
    result.expensesDeductible = apiResult.cents_expenses_deductible / 100;

    result.jobs = apiResult.tasks_total;
    result.miles = apiResult.miles_total;

    result.drivingTotalSeconds = apiResult.seconds_total;
    result.drivingHours = Math.trunc((result.drivingTotalSeconds || 0) / 60 / 60);
    result.drivingMinutes = Math.trunc(((result.drivingTotalSeconds || 0) / 60) % 60);
    //round to the nearest minute
    result.drivingSeconds = (result.drivingHours * 60 * 60) + (result.drivingMinutes * 60);


    result.drivingPaidTotalSeconds = apiResult.seconds_p3;
    result.drivingPaidHours = Math.trunc((result.drivingPaidTotalSeconds || 0) / 60 / 60);
    result.drivingPaidMinutes = Math.trunc(((result.drivingPaidTotalSeconds || 0) / 60) % 60);
    //round to the nearest minute
    result.drivingPaidSeconds = (result.drivingPaidHours * 60 * 60) + (result.drivingPaidMinutes * 60);

    result.unpaidTotalSeconds = Math.max(result.drivingTotalSeconds - result.drivingPaidTotalSeconds, 0);
    result.unpaidHours = Math.trunc((result.unpaidTotalSeconds || 0) / 60 / 60);
    result.unpaidMinutes = Math.trunc(((result.unpaidTotalSeconds || 0) / 60) % 60);
    //round to the nearest minute
    result.unpaidSeconds = (result.unpaidHours * 60 * 60) + (result.unpaidMinutes * 60);

    result.hourlyPayNet = apiResult.cents_average_hourly_net / 100;
    result.hourlyPayGross = apiResult.cents_average_hourly_gross / 100;

    result.paidTimePercent = result.drivingSeconds == 0
      ? 0
      : result.drivingPaidSeconds / result.drivingSeconds;

    result.earningsPerMile = result.miles != 0
      ? result.totalPayGross / result.miles
      : null;

    result.employerStats = apiResult.by_employer.map(x => EmployerPerformanceStatistic.parse(x));

    return result;
  }
}

export class EmployerPerformanceStatistic {

  employer: string;
  totalPayGross: number = 0;
  totalPayNet: number = 0;

  jobs: number = 0;
  miles: number = 0;

  drivingSeconds: number = 0;
  drivingHours: number = 0;
  drivingMinutes: number = 0;

  drivingPaidSeconds: number = 0;
  drivingPaidHours: number = 0;
  drivingPaidMinutes: number = 0;

  expensesMileage: number = 0;


  hourlyPayNet: number = null;
  hourlyPayGross: number = null;


  public static parse(apiResult: any) {

    const result = new EmployerPerformanceStatistic();

    result.employer = apiResult.employer?.replace("_", " ");
    result.totalPayGross = (apiResult.cents_pay + apiResult.cents_tip + apiResult.cents_promotion) / 100;
    result.expensesMileage = apiResult.cents_expenses_mileage / 100;
    result.totalPayNet = result.totalPayGross - result.expensesMileage;
    result.jobs = apiResult.tasks_total;
    result.miles = apiResult.miles_total;

    result.drivingSeconds = apiResult.seconds_total;
    result.drivingHours = Math.trunc((result.drivingSeconds || 0) / 60 / 60);
    result.drivingMinutes = Math.trunc(((result.drivingSeconds || 0) / 60) % 60);
    //round to the nearest minute
    result.drivingSeconds = (result.drivingHours * 60 * 60) + (result.drivingMinutes * 60);

    result.drivingPaidSeconds = apiResult.seconds_p3;
    result.drivingPaidHours = Math.trunc((result.drivingPaidSeconds || 0) / 60 / 60);
    result.drivingPaidMinutes = Math.trunc(((result.drivingPaidSeconds || 0) / 60) % 60);
    //round to the nearest minute
    result.drivingPaidSeconds = (result.drivingPaidHours * 60 * 60) + (result.drivingPaidMinutes * 60);

    if (result.drivingSeconds > 0) {
      result.hourlyPayGross = (result.totalPayGross / result.drivingSeconds) * 60 * 60;
      result.hourlyPayNet = (result.totalPayNet / result.drivingSeconds) * 60 * 60;
    }

    return result;
  }


}


