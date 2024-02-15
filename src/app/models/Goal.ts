import { StatSummaryLevel } from "./PerformanceStatistic"

export type GoalType = 'earnings'

export class Goal {
  type: GoalType
  frequency: StatSummaryLevel
  start_date_unix: number
  sub_goals: {
    [key: string]: number
  }

  sub_goals_info: Array<any>;
}

export class GoalMeasurement {
  type: GoalType
  frequency: StatSummaryLevel
  window_date_unix: number
  goal_amount: number
  performance_amount: number
  performance_percent: number
  additional_info: any
}

export class GoalMeasurementInfoEarnings {
    count_work_days?: number  
    count_jobs?: number
    count_tasks?: number
    count_activities?: number
    duration_seconds?: number
    duration_seconds_engaged?: number
    earnings_pay?: number
    earnings_tip?: number
    earnings_bonus?: number
    earnings_total?: number
    selected_miles?: number
    selected_miles_engaged?: number
}

