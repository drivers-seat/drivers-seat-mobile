export class ArgyleGigAccount {
  id: string;
  link_item: string;
  data_partner: string;
  is_connected: boolean;
  has_errors: boolean;
  connection_status:string;
  connection_error_code: string;
  connection_error_message: string;
  connection_updated_at: Date;
  is_synced: boolean;
  activity_status: string;
  activity_count?: number;
  activities_updated_at?: Date;
  activity_date_min?: Date;
  activity_date_max?: Date;
  was_connected: boolean;
}

export class ArgyleUser {
  constructor(
    public user_id: number,
    public argyle_id: string,
    public user_token: string,
    public accounts: { [key: string]: string },   //keyed on service name, with account id
    public service_names: string[],
    public argyle_terms_accepted_at?: string,
  ) { }

  static parseArgyleUser(user) {
    return new ArgyleUser(
      user["user_id"],
      user["argyle_id"],
      user["user_token"],
      user["accounts"],
      user["service_names"],
      user["argyle_terms_accepted_at"],
    );
  }
}

