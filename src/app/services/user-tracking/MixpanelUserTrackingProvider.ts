import { Mixpanel, MixpanelPeople } from '@awesome-cordova-plugins/mixpanel/ngx';
import { User } from "src/app/models/User";
import { TrackedEvent } from "src/app/models/TrackedEvent";
import { ApiService } from '../api.service';
import * as Sentry from "@sentry/capacitor";
import { IUserTrackingProvider } from './IUserTrackingProvider';
import { Injectable } from '@angular/core';
import { ILogService } from '../logging/log.service';
import { Logger } from '../logging/logger';
import { environment } from 'src/environments/environment';
import { IDeviceService } from '../device/device.service';


@Injectable({
  providedIn: 'root'
})
export class MixpanelUserTrackingProvider implements IUserTrackingProvider {

  private readonly _logger : Logger;
  private _isInitialized : boolean;

  constructor(
    logSvc: ILogService,
    private readonly _mixPanelSvc: Mixpanel,
    private readonly _mixPanelPeopleSvc: MixpanelPeople,
    private readonly _apiSvc: ApiService,
    private readonly _deviceSvc: IDeviceService
  ) {

    this._logger = logSvc.getLogger("MixpanelUserTrackingProvider");
  }

  public async initialize(isCordovaAvailable : boolean): Promise<void> {
    
    if(!isCordovaAvailable) {
      return;
    }

    if (environment["mixPanel"] && environment["mixPanel"]["token"]) {

      this._mixPanelSvc.init(environment["mixPanel"]["token"])
        .then(() => {
          this._logger.LogInfo("Mixpanel Service Initialized");
          this._isInitialized = true;
        })
        .catch(err => {
          this._logger.LogError(err, "Mixpanel Init Failed");
          Sentry.captureException(err)
        });
    } else{
      this._logger.LogWarning("Mixpanel not initialized, invalid config");
    }
  }

  public async setScreenName(screenName: string, eventData?: any): Promise<void> {
    this.captureEventImpl(`${TrackedEvent.navigate}_${screenName}`, eventData || {});
  }

  public async disconnectUser(): Promise<void> {
    if(!this._isInitialized){
      return;
    }

    await this._mixPanelSvc.reset();
  }

  public async captureEvent(event: string, extraInfo: any): Promise<void> {

    if(!this._isInitialized){
      return;
    }
    
    let promises = [
      this.captureEventImpl(event, extraInfo)
    ];

    switch (event) {
      case TrackedEvent.create_account:
        promises.push(this._mixPanelPeopleSvc.set({ $created: new Date().toISOString() }));
        break;

      case TrackedEvent.onboarding_finish:
      case TrackedEvent.update_profile:
        promises.push(this._mixPanelPeopleSvc.set(extraInfo));
        break;
    }

    await Promise.all(promises);
  }

  private async captureEventImpl(event: string, extraInfo: any): Promise<void> {
    await this._mixPanelSvc.track(event, extraInfo);
  }


  public async updateUserInfo(user: User): Promise<void> {
    
    if(!this._isInitialized){
      return;
    }
    
    await this._mixPanelPeopleSvc.set({
      ...user,
      language_code: this._deviceSvc.getLanguageCode(),
      app_version: this._apiSvc.appReleaseVersion
    });
  }

  public async registerUser(userIdForTracking: string, user: User): Promise<void> {
    
    if(!this._isInitialized){
      return;
    }
    
    await this._mixPanelSvc.identify(userIdForTracking);
  }
}
