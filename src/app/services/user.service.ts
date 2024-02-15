import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ResearchGroupInfo } from '../models/ResearchGroupInfo';
import { Features } from '../models/Features';
import { User } from "../models/User";
import { ApiService } from './api.service';
import 'rxjs/add/operator/toPromise';
import { BehaviorSubject } from 'rxjs';
import { Events } from './events.service';
import { UserTrackingService } from './user-tracking/user-tracking.service';
import { TrackedEvent } from '../models/TrackedEvent';
import { IDeviceService } from './device/device.service';
import { ILogService } from './logging/log.service';
import { Logger } from './logging/logger';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  currentUser: User;
  argyle_user;
  originalUser: User;
  isUsingGhost;

  private readonly _logger: Logger;

  currentUser$: BehaviorSubject<User> = new BehaviorSubject(null);

  constructor(
    logSvc: ILogService,
    public http: HttpClient, public apiService: ApiService, public events: Events,
    private readonly _userTrackingSvc: UserTrackingService,
    private readonly _deviceSvc: IDeviceService
  ) {
    this._logger = logSvc.getLogger("UserService");
    this.isUsingGhost = this.apiService.ghostToken;
  }

  async setUser(user: User): Promise<void> {

    this._logger.LogInfo("setUser", user);

    this.currentUser = user;
    this.currentUser$.next(user);

    if(!user){
      this.originalUser = null;
    }

    await this._userTrackingSvc.setUser(user)
  }

  getDevicePlatform(): string {
    return `${this.apiService.appVersion} / ${this._deviceSvc.getDeviceInfoText()}`;
  }

  getUser(userID) {
    return this.http.get(`${this.apiService.url()}/users/${userID}`)
      .toPromise().then(data => {
        const user = User.parseUser(data["data"]);
        const device_platform = this.getDevicePlatform();

        //make sure we have accurate device info
        //If the db user returned doesn't match the device/platform 
        //that they are currently using, update the back-end
        if (user.device_platform != device_platform) {
          this.updateUser(user);

          //set it here so that it is returned later on below.
          user.device_platform = device_platform;
        }

        this.setUser(user);
        return this.currentUser;
      });
  }

  public async checkEmailAvailable(email) {
    return await this.http.get(`${this.apiService.url()}/users/lookup/${email}`)
      .toPromise()
      .then(() => {
        return false;
      })
      .catch((err) => {
        return (err.status === 404);
      })
  }

  public async checkEmailAddressAvailable(email): Promise<{ email: string, isAvailable?: boolean }> {
    return await this.http.get(`${this.apiService.url()}/users/lookup/${email}`)
      .toPromise()
      .then(() => {
        return {
          email: email,
          isAvailable: false
        };
      })
      .catch((err) => {
        return {
          email: email,
          isAvailable: err.status === 404 ? true : null
        };
      })
  }

  createUser(email, password, referralCode) {
    // get timezone
    const region = new Intl.DateTimeFormat();
    const options = region.resolvedOptions();

    return this.http.post(`${this.apiService.url()}/users`,
      JSON.stringify({
        "user": {
          "email": email,
          "password": password,
          "referral_code": referralCode,
          "source": 'app',
          "timezone_device": options.timeZone,
          "language_code": this._deviceSvc.getLanguageCode(),
          "device_platform": this.getDevicePlatform()
        }
      }),
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } })
      .toPromise().then(data => {

        this._logger.LogInfo("createUser", "CREATED USER:", data);
        let user = User.parseUser(data["data"]);

        this.setUser(user).then(() => {

          this._logger.LogInfo("createUser", "SET USER:", user);
          this._userTrackingSvc.captureEvent(TrackedEvent.create_account)
            .then(() => {
              this._logger.LogInfo("createUser", "CAPTURED CREATE ACCOUNT EVENT", user);
              this.events.publish('successfulLogin');
            })
        })
        return this.currentUser;
      });
  }

  public async updatePushNotificationPermission(user_id: number, enable_notifications: boolean) {
    let user = await this.getUser(user_id);
    const opted_out = !enable_notifications;

    //Nothing to change or to save
    if (user.opted_out_of_push_notifications == opted_out) {
      return;
    }

    user.opted_out_of_push_notifications = opted_out;

    user = await this.saveUser(user);

    this.setUser(user);
  }

  public async updateShiftReminderPreferences(
    user_id: number,
    remind_shift_start: boolean,
    remind_shift_end: boolean) {

    let user = await this.getUser(user_id);

    //Nothing to change or to save
    if (user.remind_shift_start == remind_shift_start && user.remind_shift_end == remind_shift_end) {
      return;
    }

    user.remind_shift_start = remind_shift_start;
    user.remind_shift_end = remind_shift_end;

    user = await this.saveUser(user);

    this.setUser(user);
  }

  private async saveUser(user: User): Promise<User> {

    const postModel: any = { ...user };
    postModel.is_beta = user.is_beta ? "beta" : "prod";

    return this.http.put(`${this.apiService.url()}/users/${user.id}`,
      JSON.stringify({
        "user": postModel
      }),
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } })
      .toPromise().then(data => {
        let user = User.parseUser(data["data"]);
        return user;
      });
  }


  updateUser(user, trackEvent: boolean = true) {
    // get timezone
    const region = new Intl.DateTimeFormat();
    const options = region.resolvedOptions();
    let form: any = {
      email: user.email,
      vehicle_make: user.vehicle_make,
      vehicle_model: user.vehicle_model,
      vehicle_year: user.vehicle_year,
      vehicle_type: user.vehicle_type,
      engine_type: user.engine_type,
      service_names: user.service_names,
      ethnicity: user.ethnicity,
      first_name: user.first_name,
      last_name: user.last_name,
      phone_number: user.phone_number,
      device_platform: this.getDevicePlatform(),
      focus_group: user.focus_group,
      opted_out_of_push_notifications: user.opted_out_of_push_notifications,
      unenrolled_research_at: user.unenrolled_research_at,
      opted_out_of_data_sale_at: user.opted_out_of_data_sale_at,
      opted_out_of_sensitive_data_use_at: user.opted_out_of_sensitive_data_use_at,
      postal_code: user.postal_code,
      country: user.country,
      gender: user.gender,
      car_ownership: user.car_ownership,
      is_beta: user.is_beta ? "beta" : "prod",
      timezone: user.timezone,
      timezone_device: options.timeZone,
      language_code: this._deviceSvc.getLanguageCode(),
      remind_shift_start: user.remind_shift_start,
      remind_shift_end: user.remind_shift_end
    }

    if (user.referral_code && user.referral_code != "") {
      form.referral_code = user.referral_code;
    }

    if (user.password) {
      form.password = user.password
    }
    return this.http.put(`${this.apiService.url()}/users/${user.id}`,
      JSON.stringify({
        "user": form
      }),
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } })
      .toPromise().then(data => {
        let user = User.parseUser(data["data"]);

        this.setUser(user)
          .then(() => {
            if (trackEvent) {
              this._userTrackingSvc.captureEvent(TrackedEvent.update_profile);
            }
          });
        return this.currentUser;
      });
  }

  requestData(userID) {
    return this.http.post(`${this.apiService.url()}/data_request`,
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } })
      .toPromise().then(ret => {
        return ret;
      });
  }

  deleteUser(userID) {
    return this.http.delete(`${this.apiService.url()}/users/${userID}`)
      .toPromise()
      .then(ret => {
        this._userTrackingSvc.captureEvent(TrackedEvent.delete_account);
        this.logout();
        return ret;
      });
  }

  getResearchGroupInfo(groupName) {
    return this.http.get(`${this.apiService.url()}/research_groups/lookup/${groupName}`)
      .toPromise().then(data => {
        let info: ResearchGroupInfo = {
          Id: Number(data["data"]["id"]),
          Name: data["data"]["name"],
          Description: data["data"]["description"]
        };
        return info;
      });
  }

  isFeatureEnabled(featureName: string) {
    return this.originalUser?.enabled_features?.indexOf(featureName) >= 0;
  }

  setGhost(ghostID) {

    if (!this.isFeatureEnabled(Features.GHOST)) {
      this._logger.LogWarning("setGhost", "REQUEST TO GHOST FAILED", `"User ${this.currentUser?.id} does not have permissions to ghost`);
      return;
    }

    this.apiService.isGhosting = true;
    return this.http.post(`${this.apiService.adminUrl()}/ghost_user?user_id=${ghostID}`,
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } })
      .toPromise().then(ghostToken => {
        this.setUser(User.parseUser(ghostToken["data"]));
        this.isUsingGhost = true;
        return this.currentUser;
      }).catch(err => {
        this._logger.LogError(err, "setGhost");
        throw err;
      });
  }

  unGhost() {
    if (this.apiService.isGhosting) {
      this.apiService.ghostToken = null;
      this.apiService.isGhosting = false;
      this.isUsingGhost = false;

      if(this.originalUser){
        return this.getUser(this.originalUser.id)
        .then(newUser => {
          this.setUser(newUser);
          this.originalUser = newUser;
          return newUser;
        }).catch(err => {
          this._logger.LogError(err, "unGhost");
        });
      } else {
        this.setUser(null);
        return null;
      }
    }
  }

  logout() {
    this.setUser(null);
    this.originalUser = null;
    this.apiService.removeAuthToken();
    this.apiService.ghostToken = null;
    this.apiService.isGhosting = false;
    this.isUsingGhost = false;
  }
}
