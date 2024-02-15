import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import BackgroundGeolocation, { Config, Location, ProviderChangeEvent } from '@transistorsoft/capacitor-background-geolocation';
import { BehaviorSubject } from 'rxjs';
import { User } from "src/app/models/User";
import { environment } from 'src/environments/environment';
import { ApiService } from '../api.service';
import { ILogService } from '../logging/log.service';
import { Logger } from '../logging/logger';
import { LogLevel } from '../logging/LogLevel';
import { UserService } from '../user.service';
import { IDeviceService } from '../device/device.service';

export abstract class ILocationTrackingService {

  public readonly currentLocation$: BehaviorSubject<Location>;
  public readonly isTrackingLocation$: BehaviorSubject<boolean>;
  public readonly authAllowTrack_Always$: BehaviorSubject<boolean>;
  public readonly authAllowTrack_WhenInApp$: BehaviorSubject<boolean>;
  public readonly authAllowPreciseLocation$: BehaviorSubject<boolean>;

  public abstract resetOdometer(): Promise<void>;
  public abstract startTracking(): Promise<void>;
  public abstract stopTracking(): Promise<void>;
  public abstract getCurrentLocation(): Promise<Location>;
  public abstract requestPermissions(): Promise<void>
  public abstract get authTrackingStatus(): string;
}

@Injectable({
  providedIn: 'root'
})
export class LocationTrackingService extends ILocationTrackingService {

  private readonly _logger: Logger
  private readonly _isMobileDevice: boolean;
  public get appDisplayName(): string { return environment.appDisplayName; }

  private _isPluginReady: boolean;
  private _currentLocation?: Location;
  private _currentUser?: User;
  private _authAllowTrack_Always: boolean;
  private _authAllowTrack_WhenInApp: boolean;
  private _authAllowPreciseLocation: boolean;
  private _isTrackingLocation: boolean;

  public readonly currentLocation$: BehaviorSubject<Location>;
  public readonly isTrackingLocation$: BehaviorSubject<boolean>;
  public readonly authAllowTrack_Always$: BehaviorSubject<boolean>;
  public readonly authAllowTrack_WhenInApp$: BehaviorSubject<boolean>;
  public readonly authAllowPreciseLocation$: BehaviorSubject<boolean>;

  constructor(
    logSvc: ILogService,
    private readonly _platformSvc: Platform,
    private readonly _apiSvc: ApiService,
    private readonly _userSvc: UserService,
    private readonly _deviceSvc: IDeviceService,
  ) {
    super();
    this._logger = logSvc.getLogger("LocationTrackingService");
    this._isMobileDevice = this._platformSvc.is("cordova");

    //Register broadcasters
    this.currentLocation$ = new BehaviorSubject<Location>(this._currentLocation);
    this.authAllowTrack_Always$ = new BehaviorSubject<boolean>(this._authAllowTrack_Always);
    this.authAllowTrack_WhenInApp$ = new BehaviorSubject<boolean>(this._authAllowTrack_WhenInApp);
    this.authAllowPreciseLocation$ = new BehaviorSubject<boolean>(this._authAllowPreciseLocation);
    this.isTrackingLocation$ = new BehaviorSubject<boolean>(this._isTrackingLocation);

    //Configure Plugin (if available)
    if (!this._isMobileDevice || !environment.backgroundGeolocation.available) {
      this.authAllowTrack_Always$.next(this._authAllowTrack_Always);
      this.authAllowTrack_WhenInApp$.next(this._authAllowTrack_WhenInApp);
      return;
    }

    BackgroundGeolocation.onLocation((location) => {
      this._currentLocation = location;
      this.currentLocation$.next({ ...this._currentLocation });
    });

    BackgroundGeolocation.onHttp((httpEvent) => {
      this._logger.Log(httpEvent.success ? LogLevel.INFO : LogLevel.WARNING, "onHttp", httpEvent.status, httpEvent.responseText);
    });

    BackgroundGeolocation.onEnabledChange((isTracking) => {

      const prevIsTracking = this._isTrackingLocation;
      this._isTrackingLocation = isTracking;

      if (prevIsTracking != this._isTrackingLocation) {
        this.isTrackingLocation$.next(this._isTrackingLocation);
      }
    });

    //Subscribe to user change events only after the user has actually been set.
    this._userSvc.currentUser$.subscribe(u => {
      if (u) {
        this.userChanged(u);
      }
    });

    BackgroundGeolocation.onProviderChange(
      async (authState) => this.geoLocationAuthStateChanged(authState));

    //check permissions now
    BackgroundGeolocation.getProviderState()
      .then(async authState => this.geoLocationAuthStateChanged(authState));

    //Double check state when returning to app.  Catches any settings changes
    //made outside of the app
    this._platformSvc.resume.subscribe(async () => {
      const authState = await BackgroundGeolocation.getProviderState()
      await this.geoLocationAuthStateChanged(authState);
    });
  }

  public get authTrackingStatus(): string {

    const result = new Array<string>();

    if (this.authAllowTrack_Always$.value && this.authAllowPreciseLocation$.value) {

      result.push("configured");

    } else {

      if (this.authAllowTrack_Always$.value) {
        result.push("track_always_enabled");
      } else {
        result.push("track_always_disabled");

        if (this.authAllowTrack_WhenInApp$.value) {
          result.push("track_in_app_enabled");
        }
      }

      if (this.authAllowPreciseLocation$.value) {
        result.push("precise_location_enabled")
      } else {
        result.push("precise_location_disabled");
      }
    }

    return result.join(" | ");
  }

  private configurePlugin() {

    if (!this._isMobileDevice || !environment.backgroundGeolocation.available) {
      return;
    }

    const config = this.createPluginConfig();

    this._logger.LogInfo("configurePlugin");

    if (!this._isPluginReady) {
      BackgroundGeolocation.ready(config)
        .then(state => {
          this._isPluginReady = true;
          this._logger.LogInfo("Plugin is ready", state);
        })
        .catch(ex => {
          this._logger.LogError(ex, "BackgroundGeolocation.ready");
        });
    } else {
      BackgroundGeolocation.setConfig(config)
        .then(state => {
          this._isPluginReady = true;
          this._logger.LogInfo("Plugin has been reconfigured", state);
        })
        .catch(ex => {
          this._isPluginReady = false;
          this._logger.LogError(ex, "BackgroundGeolocation.setConfig");
        });
    }

    BackgroundGeolocation.getProviderState(async authState => this.geoLocationAuthStateChanged(authState));
  }

  private async geoLocationAuthStateChanged(authState: ProviderChangeEvent) {

    this._logger.LogInfo("geoLocationAuthStateChanged", authState);

    const prevAllowAlways = this._authAllowTrack_Always;
    this._authAllowTrack_Always = (authState.status == BackgroundGeolocation.AUTHORIZATION_STATUS_ALWAYS);

    const prevAllowWhenInApp = this._authAllowTrack_WhenInApp;
    this._authAllowTrack_WhenInApp = (authState.status == BackgroundGeolocation.AUTHORIZATION_STATUS_WHEN_IN_USE);

    const prevAllowPreciseLocation = this._authAllowPreciseLocation;
    this._authAllowPreciseLocation = (authState.accuracyAuthorization == BackgroundGeolocation.ACCURACY_AUTHORIZATION_FULL)

    let hasChanges = false;

    if (prevAllowAlways != this._authAllowTrack_Always) {
      hasChanges = true;
      this.authAllowTrack_Always$.next(this._authAllowTrack_Always);
    }

    if (prevAllowWhenInApp != this._authAllowTrack_WhenInApp) {
      hasChanges = true;
      this.authAllowTrack_WhenInApp$.next(this._authAllowTrack_WhenInApp);
    }

    if (prevAllowPreciseLocation != this._authAllowPreciseLocation) {
      hasChanges = true;
      this.authAllowPreciseLocation$.next(this._authAllowPreciseLocation);
    }

    if(hasChanges){
      const eventData = {
        allow_track_always: this._authAllowTrack_Always,
        allow_track_in_app: this._authAllowTrack_WhenInApp,
        allow_precise_location: this._authAllowPreciseLocation
      }
    }
  }

  private userChanged(user: User) {

    this._logger.LogInfo("userChanged", user);

    const prevUser = this._currentUser;

    this._currentUser = user;

    //If the user has changed, we need to recofigure the plugin
    if (prevUser?.id != this._currentUser?.id) {
      this._logger.LogInfo("userChanged", "Configuring Geolocation Plugin");
      this.configurePlugin();
    }

    if (this._apiSvc.isGhosting) {
      this._logger.LogInfo("Requesting Location Tracking to stop because ghosting");
      this.stopTracking()
    }
  }

  public async resetOdometer(): Promise<void> {

    if (!this._isMobileDevice) {
      return;
    }

    if (!environment.backgroundGeolocation.available){
      this._logger.LogDebug("resetOdometer", "Ignoring because location tracking is not enabled in config");
      return;
    }

    if (!this._isPluginReady) {
      this._logger.LogDebug("resetOdometer", "Ignoring because plugin is not ready");
      return;
    }

    await BackgroundGeolocation.resetOdometer();
  }

  public async getCurrentLocation(): Promise<Location> {

    if (!this._isMobileDevice) {
      return null;
    }

    if (!environment.backgroundGeolocation.available){
      this._logger.LogDebug("getCurrentLocation", "Ignoring because location tracking is not enabled in config");
      return;
    }

    if (!this._isPluginReady) {
      this._logger.LogDebug("getCurrentLocation", "Ignoring because plugin is not ready");
      return;
    }

    return await BackgroundGeolocation.getCurrentPosition({
      maximumAge: 5000    //Accept a location captured within 5 seconds before getting a new one
    });
  }

  public async startTracking(): Promise<void> {

    if (this._apiSvc.isGhosting) {
      this._logger.LogInfo("Ignoring Request to Start Tracking because currently ghosting");
      return;
    }

    if (!this._isMobileDevice) {
      return null;
    }

    if (!environment.backgroundGeolocation.available){
      this._logger.LogDebug("startTracking", "Ignoring because location tracking is not enabled in config");
      return;
    }

    if (!this._isPluginReady) {
      this.configurePlugin();
    }

    BackgroundGeolocation.start()
      .then(state => {
        this._logger.LogInfo("startTracking", "Geolocation tracking started", state);

        //Android emulator may not set the device as moving which
        //causes points to not be collected.
        if (this._deviceSvc.is_Android && this._deviceSvc.is_Android) {
          BackgroundGeolocation.changePace(true);
        }
      })
      .catch(ex => {
        this._logger.LogError(ex, "startTracking", "BackgroundGeolocation.start");
      })
  }

  public async stopTracking(): Promise<void> {

    if (!this._isMobileDevice) {
      return null;
    }

    if (!environment.backgroundGeolocation.available){
      this._logger.LogDebug("stopTracking", "Ignoring because location tracking is not enabled in config");
      return;
    }

    if (!this._isPluginReady) {
      this._logger.LogDebug("stopTracking", "Ignoring because plugin is not ready");
      return;
    }

    //stop location tracking
    BackgroundGeolocation.stop()
      .then(state => {
        this._logger.LogInfo("stopTracking", "Geolocation tracking stopped", state);
      })
      .catch(ex => {
        this._logger.LogError(ex, "stopTracking", "BackgroundGeolocation.stop");
      });

    //send any remaining locations
    BackgroundGeolocation.sync()
      .then((x) => {
        this._logger.LogInfo("stopTracking", "Flush remaining locations complete");
      })
      .catch((ex => {
        this._logger.LogError(ex, "stopTracking", "BackgroundGeolocation.sync");
      }));
  }

  public async requestPermissions(): Promise<void> {

    if (!this._isMobileDevice) {
      return;
    }

    if (!environment.backgroundGeolocation.available){
      this._logger.LogDebug("requestPermissions", "Ignoring because location tracking is not enabled in config");
      return;
    }

    try {
      await BackgroundGeolocation.requestPermission()
    } catch (ex) {
      this._logger.LogWarning("requestPermissions", "User may not have authorized", ex);
      return;
    }
  }

  private createPluginConfig(): Config {

    const config: Config = {};

    config.debug = environment.backgroundGeolocation.debug;
    config.logLevel = environment.backgroundGeolocation.logLevel;

    config.reset = true;
    config.foregroundService = true;
    config.activityType = BackgroundGeolocation.ACTIVITY_TYPE_AUTOMOTIVE_NAVIGATION;
    config.desiredAccuracy = BackgroundGeolocation.DESIRED_ACCURACY_NAVIGATION;
    config.stationaryRadius = 1;
    config.pausesLocationUpdatesAutomatically = false;
    config.useSignificantChangesOnly = false;
    config.url = `${this._apiSvc.url()}/points`;
    config.batchSync = true;
    config.maxBatchSize = 60;         //break into batches of 60
    config.autoSyncThreshold = 30;    //wait to send until 30 locs are collected
    config.stopOnTerminate = false;
    config.startOnBoot = true;
    config.allowIdenticalLocations = true;

    config.fastestLocationUpdateInterval = 3000;

    //This is our desired tracking level and the informatino to present on dialogs to the user
    config.locationAuthorizationRequest = "Always";
    config.backgroundPermissionRationale = {
      title: "Tracking your mileage",
      message: "In order to analyze your driving, we need to access your location and motion data \"always\", even when you're not in the app.",
      positiveAction: "Allow",
      negativeAction: "Don't Allow",
    }

    config.notification = {
      title: this.appDisplayName,
      text: "Tracking GPS"
    };

    config.headers = {
      "authorization": `${this._apiSvc.authToken()}`,
      "dsc-device-id": `${this._deviceSvc.getDeviceId()}`,
      "dsc-device-platform": `${this._deviceSvc.getPlatform()}`,
      "dsc-device-os": `${this._deviceSvc.getOSVersion()}`,
      "dsc-device-language": `${this._deviceSvc.getLanguageCode()}`,
      "dsc-device-name": `${this._deviceSvc.getDeviceName()}`,
      "dsc-app-version": `${this._apiSvc.appReleaseVersion}`,
      "dsc-location-tracking-config-status": `${this.authTrackingStatus}`
    };

    config.extras = {
      user_id: this._currentUser.id,
      status: 'working'
    };

    return config;
  }


}
