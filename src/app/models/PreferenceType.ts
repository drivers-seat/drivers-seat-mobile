export enum PreferenceType {
  HourlyPayAnalytics = "average_hourly_pay_analytics",
  AppVersionFirstUsage = "app_version_first_use",
  Privacy = "privacy",
  DashboardEarnings = "dashboard_earnings_summary",
  DashboardLayout = "dashboard_layout"
}

export class PreferenceValue {
  key :PreferenceType;
  last_updated_app_version: string;
  last_updated_device_id: string;
  value: any;
}

export interface IPrivacyDisplayOptions {
  confirmed_optOutDataSale_on?: number,
  confirmed_limitDataUse_on?: number
}