import { StatSummaryLevel } from "./PerformanceStatistic";

export class HourlyPayAnalyticsOptions {
  metro_area_id: number;
  service_classes: Array<string>;
  employer_ids: number[];
  highlight_work_schedule: boolean;
  deduct_mileage: boolean;
  display_value: 'avgHourlyPay' | 'bestEmployerPay';

  public static validationMessages(item: HourlyPayAnalyticsOptions) : Array<string>{
    const msgs = new Array<string>();
    if(!item?.metro_area_id){
      msgs.push("Select a Metro Area");
    }

    if (!(item?.service_classes?.length > 0 || item?.employer_ids?.length > 0)){
      msgs.push("Select at least one gig platform");
    }

    if(!item?.display_value){
      msgs.push("Select a calculation type");
    }

    return msgs;
  }

  public static isValid(item: HourlyPayAnalyticsOptions): boolean {
    return HourlyPayAnalyticsOptions.validationMessages(item).length == 0;
  }
}

export class DashboardEarningsOptions {
  summary_level: StatSummaryLevel
}