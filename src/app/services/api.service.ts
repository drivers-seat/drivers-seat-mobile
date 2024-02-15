import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import 'rxjs/add/operator/toPromise';
import { environment } from 'src/environments/environment';
import { ILogService } from './logging/log.service';
import { Logger } from './logging/logger';
import { BehaviorSubject } from 'rxjs';
import { Events } from './events.service';
import { IDeviceService } from './device/device.service';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private readonly _logger: Logger;

  public readonly isReady$: BehaviorSubject<boolean> = new BehaviorSubject(false);

  public key;
  public readonly appReleaseVersion = environment.versionId;
  public readonly appVersion = `${this.appReleaseVersion}.${environment.buildId}`;

  private _storage: Storage;

  constructor(
    logSvc: ILogService,
    private readonly _storageSvc: Storage,
    private readonly _eventsSvc: Events,
    private readonly _deviceSvc: IDeviceService,
    public http: HttpClient,
  ) {

    this._logger = logSvc.getLogger("ApiService");

    this._deviceSvc.isReady$.subscribe(isReady=>{
      if(!isReady){
        return;
      }
      this.initialize();
    });
  }

  private async initialize() {
    this._storage = await this._storageSvc.create();

    this._eventsSvc.subscribe("successfulLogin", () => {
      this.set("startPage", "login");
    })

    this.isReady$.next(true);
  }

  public set(key: string, value: any) {
    
    const newKey = `${this._deviceSvc.getDeviceId()}_${key}`;

    this._logger.LogInfo("Persisting", key, value, newKey);

    this._storage?.set(newKey, value);
  }

  public async get(key: string) {

    const newKey = `${this._deviceSvc.getDeviceId()}_${key}`;
    this._logger.LogInfo("Retrieving", key, newKey);

    return await this._storage?.get(newKey);
  }

  public apiEnvironmentIsProduction() {
    return environment.production;
  }

  endpoint_url(){
    return `${environment.apiEndpoint}`;
  }

  url() {
    return `${this.endpoint_url()}/api`;
  }

  adminUrl() {
    return `${this.url()}/_admin`;
  }

  authToken() {
    if (this.ghostToken) {
      return this.ghostToken;
    }
    return this.key;
  }

  public _focusGroup: string;

  get focusGroup(): string {
    return this._focusGroup;
  }

  set focusGroup(value: string) {
    console.log('FOCUS GROUP SET:', value)
    this._focusGroup = value;
  }

  public _isRegistering: boolean = false;

  get isRegistering(): boolean {
    return this._isRegistering;
  }

  set isRegistering(value: boolean) {
    console.log('IS REGISTERING:', value)
    this._isRegistering = value;
  }

  public _locationTrackingAccepted: boolean = false;

  get locationTrackingAccepted(): boolean {
    return this._locationTrackingAccepted;
  }

  set locationTrackingAccepted(value: boolean) {
    this._locationTrackingAccepted = value;
  }

  public _ghostToken = null;
  get ghostToken(): string {
    return this._ghostToken;
  }
  set ghostToken(value: string) {
    this._ghostToken = value;
    if (value === null) {
      console.log('JUST SET TO NULL')
    }
  }

  public _isGhosting = false;
  get isGhosting(): boolean {
    return this._isGhosting;
  }
  set isGhosting(value: boolean) {
    this._isGhosting = value;
  }

  getAppVersion() {
    return this.appVersion;
  }

  getAuthToken() {
    // Create or open DB
    return this._storage.get('dsc_authToken')
      .then(t => {
        this.key = t;
        return t;
      });
  }

  saveAuthToken(authToken) {
    this._storage.set('dsc_authToken', authToken);
    this.key = authToken;
    return this.key;
  }

  public async removeAuthToken(shouldPublishEvent: boolean = true) {
    this.ghostToken = null;
    await this._storage.remove('dsc_authToken');
    if (shouldPublishEvent) {
      this._eventsSvc.publish('badAuthToken');
    }
  }

  public async setProfileNotificationDismissed(d: Date) {
    return this.get('profilenotif').then(notif => {
      const lastNotification = JSON.parse(notif || `{"count": 1}`);
      return this.set('profilenotif', JSON.stringify({
        lastDismissed: d.getTime(),
        count: lastNotification.count + 1
      }))
    });
  }

  public async getProfileNotificationHistory() {
    return this.get('profilenotif').then((notif) => {
      return JSON.parse(notif || `{
        "lastDismissed": 0,
        "count": 1
      }`);
    })
  }
}
