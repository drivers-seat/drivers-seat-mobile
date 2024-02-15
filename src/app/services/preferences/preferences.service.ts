import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { fromUnixTime, getUnixTime } from 'date-fns';
import { BehaviorSubject } from 'rxjs';
import { User } from "src/app/models/User";
import { PreferenceType, PreferenceValue } from 'src/app/models/PreferenceType';
import { ApiService } from '../api.service';
import { IDeviceService } from '../device/device.service';
import { ILogService } from '../logging/log.service';
import { Logger } from '../logging/logger';
import { UserService } from '../user.service';


export abstract class IPreferenceService {
  public abstract isReady$: BehaviorSubject<boolean>;
  public abstract updatePreferenceValue(preferenceType: PreferenceType, value: any, forcePost: boolean): Promise<boolean>
  public abstract subscribe(preferenceType: PreferenceType | string, delegate: (value: PreferenceValue)=>void);
  public abstract currentVersionFirstUsageDate$:BehaviorSubject<Date>;
}

@Injectable({
  providedIn: 'root'
})
export class PreferencesService implements IPreferenceService {

  public readonly currentVersionFirstUsageDate$: BehaviorSubject<Date> = new BehaviorSubject(null);
  public readonly isReady$: BehaviorSubject<boolean> = new BehaviorSubject(false);

  private readonly _refereshIntervalSeconds = 60 * 5;

  private readonly _logger: Logger
  private _user: User;
  private readonly _preferences: { [key: string]: PreferenceValue }
  private readonly _subscriptions: { [key: string]: BehaviorSubject<PreferenceValue> };

  constructor(
    logSvc: ILogService,
    private readonly _apiSvc: ApiService,
    private readonly _userSvc: UserService,
    private readonly _httpSvc: HttpClient,
    private readonly _deviceSvc: IDeviceService,
  ) {

    this._logger = logSvc.getLogger("PreferencesService");
    this._preferences = {};
    this._subscriptions = {};

    this._userSvc.currentUser$.subscribe(async u => {
      const old_user = this._user;
      this._user = u;

      if(this._user?.id == old_user?.id && this._user?.agreed_to_current_terms == old_user?.agreed_to_current_terms){
        return;
      }

      await this.onUserChanged();
    });

    //Subscribe to changes in the app version first usage date
    this.subscribe(PreferenceType.AppVersionFirstUsage, (prefVal)=>{

      const curVersion = this._apiSvc.appReleaseVersion;
      
      let installDateUnix = null;
      if(prefVal?.value && Number.isFinite(prefVal.value[curVersion])){
        installDateUnix = prefVal.value[curVersion];
      }

      if(installDateUnix == this.currentVersionFirstUsageDate$.value){
        return;
      }

      this.currentVersionFirstUsageDate$.next(fromUnixTime(installDateUnix));
    })

    //Auto refresh preference values in case a default has changed
    setInterval(async ()=> this.onUserChanged(), this._refereshIntervalSeconds * 1000);
  }

  public subscribe(preferenceType: PreferenceType | string, delegate: (value: PreferenceValue)=>void) {
    this._subscriptions[preferenceType] = this._subscriptions[preferenceType] || new BehaviorSubject<any>(this._preferences[preferenceType]);
    this._subscriptions[preferenceType].subscribe(delegate);
  }

  private async onUserChanged(){
    if(!this._user){
      this.updatePreferences([]);
      this.isReady$.next(false);
      return;
    }

    await this.getPreferenceValues()
    this.isReady$.next(true);
  }

  private async getPreferenceValues(){
    const url = `${this._apiSvc.url()}/app_preferences`;
    await this._httpSvc.get(url).toPromise()
      .then(data=>{
        this.updatePreferences(data["data"]);

        if(!this._apiSvc.isGhosting){
          this.setAppVersionUsage();
        }
      });
  }

  private setAppVersionUsage(){

    this._logger.LogDebug("setAppVersionUsage",this._apiSvc.appReleaseVersion);
    const releaseVersion = this._apiSvc.appReleaseVersion;
    const pref = this._preferences[PreferenceType.AppVersionFirstUsage];
    
    const val = { ...pref?.value || {} };

    if(!val[releaseVersion] || !Number.isFinite(val[releaseVersion])){
      val[releaseVersion] = getUnixTime(new Date());
    }
    
    this.updatePreferenceValue(PreferenceType.AppVersionFirstUsage, val);
  }


  private updatePreferences(new_prefs: Array<PreferenceValue>){

    this._logger.LogInfo("updatePreferences", new_prefs);

    const keys = {};
    Object.keys(this._preferences).forEach(k=>keys[k]=true);
    new_prefs.forEach(p=>keys[p.key] = true);

    const new_prefs_map = this.build_preferences_map(new_prefs);

    Object.keys(keys).forEach(key=>{

      //new preferences
      if(!this._preferences[key] && new_prefs_map[key]) {
        this._logger.LogDebug("updatePreferences",key,"Detected new preference");
        this.onPreferenceValueChanged(key, new_prefs_map[key]);
        return;
      }

      //existing preference value removed
      if(this._preferences[key] && !new_prefs_map[key]){
        this._logger.LogDebug("updatePreferences",key,"Detected removal of preference");
        this.onPreferenceValueChanged(key, null);
        return;
      }

      const exist_pref_json = JSON.stringify((this._preferences[key])?.value)
      const new_pref_json = JSON.stringify((new_prefs_map[key])?.value)
      if(exist_pref_json != new_pref_json) {
        this._logger.LogDebug("updatePreferences",key,"Detected changed value", this._preferences[key]?.value, new_prefs_map[key]?.value);
        this.onPreferenceValueChanged(key, new_prefs_map[key]);
      }
    })
  }

  private onPreferenceValueChanged(preferenceType: PreferenceType | string, newValue: PreferenceValue) {
    this._preferences[preferenceType] = newValue;

    if(this._subscriptions[preferenceType]){
      this._logger.LogDebug("onPreferenceValueChanged", "Broadcasting Change", preferenceType, newValue);
      this._subscriptions[preferenceType].next(newValue);
    }
  }

  private areObjectsEquivalent(a:any, b:any):boolean{

    if(!a && b || a && !b){
      return false;
    }

    if(!a && !b){
      return true;
    }

    const keys = Object.keys(a)
    keys.push(...Object.keys(b));
    for (let i = 0; i < keys.length; i++) {

      if(JSON.stringify(a[keys[i]]) != JSON.stringify(b[keys[i]])){
        return false;
      }
    }

    return true;
  }

  public async updatePreferenceValue(preferenceType: PreferenceType, value: any, forcePost: boolean = false): Promise<boolean> {
    
    this._logger.LogDebug("updatePreferenceValue", preferenceType, value, forcePost);

    if(!this._user){
      this._logger.LogInfo("updatePreferenceValue", "Ignoring request to update preferences because there's no user");
      return false;
    }

    const pref = this._preferences[preferenceType];
    if(!forcePost && this.areObjectsEquivalent(pref?.value, value)){
      return false;
    }

    this._logger.LogDebug("updatePreferenceValue", preferenceType, pref?.value, value);

    if(this._apiSvc.isGhosting){

      this._logger.LogInfo("updatePreferenceValue", "Ignoring request to update preferences during ghost");
      const newVal = new PreferenceValue();
      newVal.key = preferenceType;
      newVal.last_updated_app_version = this._apiSvc.appVersion;
      newVal.last_updated_device_id = this._deviceSvc.getDeviceId();
      newVal.value = value;

      const prefCopy = {...this._preferences};
      
      prefCopy[preferenceType] = newVal;
      
      this.updatePreferences(Object.values(prefCopy).filter(x=>x));
      return true;
    }

    this._logger.LogInfo("updatePreferenceValue", "posting new value", preferenceType, value);

    const url = `${this._apiSvc.url()}/app_preferences/${preferenceType}`;
    const postData = {
      value: value
    };

    this._httpSvc.put(url, postData).toPromise()
      .then(data => {
        this.updatePreferences(data["data"]);
      })
      .catch(ex => {
        this._logger.LogError(ex, "setPreference");
      });

    return true;
  }

  private build_preferences_map(preferences:Array<PreferenceValue>) : {[key:string]: PreferenceValue} {
    const result = {};
    preferences.forEach(p=>result[p.key] = p);
    return result;
  }
}
