
export enum ReferralType {
  FromMenu = "app_invite_menu",
  FromHourlyPayAnalytics = "app_invite_hourly_pay_analytics"
}

export class ReferralSource {
  referral_type: ReferralType
  referral_code: string
  is_active: boolean
}

