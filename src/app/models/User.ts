import { TextHelper } from "../helpers/TextHelper";

export class User {

  public get requiredProfileValidationMessages(): { [key: string]: string[] } {
    
    const result: { [key: string]: string[] } = {};

    if (!this.last_name || this.last_name.trim() == "") {
      result["last_name"] = ["Last Name is required"];
    }

    if (!this.first_name || this.first_name.trim() == "") {
      result["first_name"] = ["First Name is required"];
    }

    if(this.phone_number && this.phone_number.trim() != "" && !TextHelper.isPhoneNumberValid(this.phone_number.trim())){
      result["phone_number"] = ["Please enter a valid phone number"];
    }

    if (!this.postal_code || this.postal_code.trim() == "") {
      result["postal_code"] = ["Postal Code is required"];
    } else if (!TextHelper.isValidPostalCode(this.postal_code))
      result["postal_code"] = ["Postal Code is not properly formatted"];
    return result;
  }

  public get isRequiredProfileComplete(): boolean {
    return Object.keys(this.requiredProfileValidationMessages).length == 0;
  }

  public get isRecommendedProfileComplete(): boolean {
    return this.isRequiredProfileComplete;
    //TODO:  Add More;
  }

  public id: number;
  public agreed_to_current_terms: boolean;
  public email: string;
  public is_beta: boolean;
  public is_demo_account: boolean;
  public first_name: string;
  public last_name: string;
  public phone_number: string;
  public service_names: string[];
  public ethnicity: string[];
  public vehicle_type: string;
  public vehicle_make: string;
  public vehicle_model: string;
  public vehicle_year: number;
  public engine_type: string;
  public device_platform: string;
  public focus_group: string;
  public currently_on_shift: string;
  public opted_out_of_push_notifications: boolean;
  public average_gross_pay: number;
  public average_net_pay: number;
  public timezone_device: string;
  public has_referral_source: boolean;
  public created_at: Date;
  public timezone?: string;
  public enrolled_research_at?: Date;
  public unenrolled_research_at?: Date;
  public car_ownership?: string;
  public password?: string;
  public postal_code?: string;
  public country?: string;
  public gender?: string;
  public enabled_features?: string[];
  public language_code?: string;
  public remind_shift_start?: boolean;
  public remind_shift_end?: boolean;

  private _optOutDataSaleAt?: Date;
  public get opted_out_of_data_sale_at(): Date {
    return this._optOutDataSaleAt;
  }
  public set opted_out_of_data_sale_at(value: Date) {
    this._optOutDataSaleAt = value;
  }

  public get opted_out_of_data_sale(): boolean {
    return this._optOutDataSaleAt != null;
  }
  public set opted_out_of_data_sale(value: boolean) {

    this._optOutDataSaleAt = value
      ? this._optOutDataSaleAt || new Date()
      : null;
  }

  private _optOutSensitiveDataUseAt?: Date;
  public get opted_out_of_sensitive_data_use_at(): Date {
    return this._optOutSensitiveDataUseAt;
  }
  public set opted_out_of_sensitive_data_use_at(value: Date) {
    this._optOutSensitiveDataUseAt = value;
  }

  public get opted_out_of_sensitive_data_use(): boolean {
    return this._optOutSensitiveDataUseAt != null;
  }
  public set opted_out_of_sensitive_data_use(value: boolean) {

    this._optOutSensitiveDataUseAt = value
      ? this._optOutSensitiveDataUseAt || new Date()
      : null;
  }

  static parseUser(obj: any) {

    const result = new User();

    result.id = obj["id"];
    result.agreed_to_current_terms = obj["agreed_to_current_terms"] || false;
    result.email = obj["email"];
    result.is_beta = obj["is_beta"] == true || obj["is_beta"] == 'beta';
    result.is_demo_account = obj["is_demo_account"] == true;
    result.first_name = obj["first_name"];
    result.last_name = obj["last_name"];
    result.phone_number = obj["phone_number"];
    result.service_names = obj["service_names"];
    result.ethnicity = obj["ethnicity"];
    result.vehicle_type = obj["vehicle_type"];
    result.vehicle_make = obj["vehicle_make"];
    result.vehicle_model = obj["vehicle_model"];
    result.vehicle_year = obj["vehicle_year"];
    result.engine_type = obj["engine_type"];
    result.device_platform = obj["device_platform"];
    result.focus_group = obj["focus_group"];
    result.currently_on_shift = obj["currently_on_shift"];
    result.opted_out_of_push_notifications = obj["opted_out_of_push_notifications"];
    result.timezone_device = obj["timezone_device"];
    result.has_referral_source = obj["has_referral_source"];
    result.timezone = obj["timezone"];
    result.car_ownership = obj["car_ownership"];
    result.password = obj["password"];
    result.postal_code = obj["postal_code"];
    result.country = obj["country"];
    result.gender = obj["gender"];
    result.enabled_features = obj["enabled_features"];
    result.language_code = obj["language_code"];
    result.remind_shift_start = obj["remind_shift_start"];
    result.remind_shift_end = obj["remind_shift_end"];

    if (obj["created_at"]){
      result.created_at = new Date(obj["created_at"]);
    }

    if (obj["enrolled_research_at"]) {
      result.enrolled_research_at = new Date(obj["enrolled_research_at"]);
    }

    if (obj["unenrolled_research_at"]) {
      result.unenrolled_research_at = new Date(obj["unenrolled_research_at"]);
    }

    if (obj["opted_out_of_data_sale_at"]) {
      result.opted_out_of_data_sale_at = new Date(obj["opted_out_of_data_sale_at"]);
    }

    if (obj["opted_out_of_sensitive_data_use_at"]) {
      result.opted_out_of_sensitive_data_use_at = new Date(obj["opted_out_of_sensitive_data_use_at"]);
    }

    return result;
  }

}
