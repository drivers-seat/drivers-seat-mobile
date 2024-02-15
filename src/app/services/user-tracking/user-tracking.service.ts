import { Injectable } from '@angular/core';
import { User } from "src/app/models/User";
import { TrackedEvent } from "src/app/models/TrackedEvent";
import { ApiService } from '../api.service';
import { IUserTrackingProvider } from './IUserTrackingProvider';
import { MixpanelUserTrackingProvider } from "./MixpanelUserTrackingProvider";
import { NavigationEnd, Router, RouterEvent } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Logger } from '../logging/logger';
import { ILogService } from '../logging/log.service';
import { OneSignalUserTrackingProvider } from './OneSignalUserTrackingProvider';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserTrackingService {

  private readonly _logger: Logger;
  private _user: User = null;
  private _trackingProviders: Map<string, IUserTrackingProvider> = null;
  private _isInitialized: boolean = false;

  constructor(
    logSvc: ILogService,
    private readonly _apiSvc: ApiService,
    private readonly _router: Router,
    private readonly _mixPanelTrackingProvider: MixpanelUserTrackingProvider,
    private readonly _onesignalTrackingProvider: OneSignalUserTrackingProvider
  ) {

    this._logger = logSvc.getLogger("UserTrackingService");

    this._trackingProviders = new Map<string, IUserTrackingProvider>();

    //Change the screen name
    this._router.events.pipe(
      filter((e: RouterEvent) => e instanceof NavigationEnd),
    ).subscribe((e: RouterEvent) => {
      this.setScreenName(e.url)
    });
  }

  public async initialize(
    isCordovaAvailable: boolean
  ) {

    this._logger.LogInfo("initialize", "isCordovaAvailable", isCordovaAvailable);

    this._trackingProviders.clear();

    if (!environment.trackEvents){
      this._logger.LogInfo("initialize", "Event Tracking disabled");
      return;
    }

    if (isCordovaAvailable) {
      this._trackingProviders.set("MixPanel", this._mixPanelTrackingProvider);
      this._trackingProviders.set("OneSignal", this._onesignalTrackingProvider);
    }

    this._trackingProviders.forEach((provider, providerKey) => {

      this._logger.LogInfo("initialize", "Initializing Provider", providerKey);

      provider.initialize(isCordovaAvailable)
        .catch(ex => {
          this._logger.LogError(ex, "initialize", "Failed to initialize provider", providerKey);
          this._trackingProviders.delete(providerKey);
        });
    });

    this._isInitialized = true;
  }

  public async setUser(user: User): Promise<void> {

    this._logger.LogInfo("setUser", user);

    if(!this._isInitialized){
      return;
    }

    let oldUser = this._user;
    this._user = user;

    let oldUserId = oldUser?.id;
    let newUserId = this._user?.id

    //If there was an old user and its id isn't the same, logut
    if (oldUser && oldUserId != newUserId) {
      await this.disconnectUser();
    }

    //if there is no current user, return
    if (!this._user) {
      return;
    }

    if (this._apiSvc.isGhosting) {
      this._logger.LogDebug("setUser", "Disable tracking when ghosting is enabled")
      return;
    }

    //if this is a new user, register them in thet tracking services
    if (oldUserId != newUserId) {
      this._logger.LogDebug("setUser", `old user ${oldUserId}, new User ${newUserId}, registering...`);
      await this.registerUser(this._user);
      this._logger.LogDebug("setUser", `old user ${oldUserId}, new User ${newUserId}, registering...complete`);
    }
  }

  public async captureEvent(event: TrackedEvent, extraInfo: any = null): Promise<void> {

    if(!this._isInitialized){
      return;
    }

    this._logger.LogInfo("captureEvent", event, extraInfo);

    if (!this._user) {
      this._logger.LogDebug("captureEvent", event, "User has not been registered");
      return;
    }

    if (this._apiSvc.isGhosting) {
      this._logger.LogDebug("captureEvent", event, "Disable tracking when ghosting is enabled");
      return;
    }

    let promises = [];
    this._trackingProviders.forEach((provider, providerKey) => {
      promises.push(this.captureEventImpl(event, extraInfo, providerKey, provider));
    });

    await Promise.all(promises);

    this._logger.LogDebug("captureEvent", event, "complete");
  }

  private async captureEventImpl(event: string, extraInfo: any, providerKey: string, provider: IUserTrackingProvider): Promise<void> {
    try {
      this._logger.LogDebug("captureEvent", providerKey, event);
      await provider.captureEvent(event, extraInfo);
    } catch (ex) {
      this._logger.LogError(ex, "captureEvent", providerKey, event);
    }
  }

  public async captureCampaignEvent(campaign_id: string, event_type: string, action_id: string = null, extraInfo: any = null): Promise<void> {

    if(!this._isInitialized){
      return;
    }

    const event = `campaign/${campaign_id}/${event_type}`;
    extraInfo = { ...extraInfo };
    extraInfo["campaign"] = campaign_id;

    if (action_id) {
      extraInfo["action"] = action_id;
    }

    let promises = [];
    this._trackingProviders.forEach((provider, providerKey) => {
      promises.push(this.captureEventImpl(event, extraInfo, providerKey, provider));
    });

    await Promise.all(promises);
  }


  private async disconnectUser() {

    if(!this._isInitialized){
      return;
    }

    this._logger.LogInfo("disconnectUser", "start");

    let promises = [];
    this._trackingProviders.forEach((provider, providerKey) => {
      promises.push(this.disconnectUserImpl(providerKey, provider));
    });

    await Promise.all(promises);

    this._logger.LogDebug("disconnectUser", "complete");
  }

  private async disconnectUserImpl(providerKey: string, provider: IUserTrackingProvider): Promise<void> {
    try {
      this._logger.LogDebug("disconnectUser", providerKey);
      await provider.disconnectUser();
    } catch (ex) {
      this._logger.LogError(ex, "disconnectUser", providerKey);
    }
  }

  public async updateUserInfo(user: User): Promise<void> {

    if(!this._isInitialized){
      return;
    }

    if (!user) {
      this._logger.LogWarning("updateUserInfo", "user is null");
      return;
    }

    this._logger.LogInfo("updateUserInfo", "start", user);

    let promises = [];
    this._trackingProviders.forEach((provider, providerKey) => {
      promises.push(this.updateUserInfoImpl(user, providerKey, provider));
    });

    await Promise.all(promises);

    this._logger.LogDebug("updateUserInfo", "complete");
  }

  private async updateUserInfoImpl(user: User, providerKey: string, provider: IUserTrackingProvider): Promise<void> {
    try {
      this._logger.LogDebug("updateUserInfo", providerKey, user);
      await provider.updateUserInfo(user);
    } catch (ex) {
      this._logger.LogError(ex, "updateUserInfo", providerKey, user);
    }
  }

  public async registerUser(user: User): Promise<void> {
    
    if(!this._isInitialized){
      return;
    }

    if (!user) {
      this._logger.LogWarning("registerUser", "user is null");
      return;
    }

    this._logger.LogInfo("registerUser", "start", user);

    let promises = [];
    this._trackingProviders.forEach((provider, providerKey) => {
      promises.push(this.registerUserImpl(user, `${user.id}`, providerKey, provider));
    });

    await Promise.all(promises);

    this._logger.LogDebug("registerUser", "complete");
  }

  private async registerUserImpl(user: User, userIdForTracking: string, providerKey: string, provider: IUserTrackingProvider): Promise<void> {
    try {
      this._logger.LogDebug("registerUser", providerKey, userIdForTracking, user);
      await provider.registerUser(userIdForTracking, user);
    } catch (ex) {
      this._logger.LogError(ex, "registerUser", providerKey);
    }
  }

  public async setScreenName(screenName: string, eventData?: any): Promise<void> {

    if(!this._isInitialized){
      return;
    }

    if (screenName) {
      screenName = '/' + screenName.split("?")[0];
      screenName = screenName.replace('//', '/');
    }

    this._logger.LogInfo("setScreenName", "start", screenName, eventData);

    let promises = [];
    this._trackingProviders.forEach((provider, providerKey) => {
      promises.push(this.setScreenNameImpl(screenName, eventData, providerKey, provider));
    });

    await Promise.all(promises);

    this._logger.LogDebug("setScreenName", "complete", screenName);
  }

  private async setScreenNameImpl(screenName: string, eventData: any, providerKey: string, provider: IUserTrackingProvider): Promise<void> {
    try {
      this._logger.LogDebug("setScreenName", providerKey, screenName);
      await provider.setScreenName(screenName, eventData);
    } catch (ex) {
      this._logger.LogError(ex, "setScreenName", providerKey);
    }
  }
}