import { HttpClient, HttpUrlEncodingCodec } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { User } from "src/app/models/User";
import { ApiService } from '../api.service';
import { IDeviceService } from '../device/device.service';
import { ILogService } from '../logging/log.service';
import { Logger } from '../logging/logger';
import { UserService } from '../user.service';

export abstract class IExternalContentService {
  public abstract getSafeUrl(url: string, withUserAttribs?: boolean): SafeResourceUrl;
  public abstract setQueryParamValue(url: string, key: string, value: string, overwrite?: boolean): string
  public abstract deleteQueryParamValue(url: string, key: string): string;
  public abstract santizeHtml(html: string): SafeHtml;
  public abstract isUrlExternal(url: string): boolean;
  public abstract isUrlVideoContent(url: string): boolean;
  public abstract getExternalHtml(url: string, addUserAttribsToUrl?: boolean): Promise<SafeHtml>;
}

export class ExternalUrls {
  onboarding: {
    welcome: SafeResourceUrl,
  }
  performanceDashboard: {
    help: SafeResourceUrl,
    noData: SafeResourceUrl,
    unpaidTime: SafeResourceUrl,
    payTypes: SafeResourceUrl,
    byPlatform: SafeResourceUrl,
    trending: SafeResourceUrl
  }
  news: SafeResourceUrl
}

@Injectable({
  providedIn: 'root'
})
export class ExternalContentService implements IExternalContentService {

  private readonly _logger: Logger
  private _currentUser: User;

  private _queryParams: string;

  constructor(
    logSvc: ILogService,
    private readonly _apiSvc: ApiService,
    private readonly _deviceSvc: IDeviceService,
    private readonly _userSvc: UserService,
    private readonly _domSanitizer: DomSanitizer,
    private readonly _httpEncoder: HttpUrlEncodingCodec,
    private readonly _httpSvc: HttpClient
  ) {

    this._logger = logSvc.getLogger("ExternalContentService");

    this._userSvc.currentUser$.subscribe(u => this._currentUser = u);
  }

  public addUserAttributesToUrl(url: string) {

    url = this.setQueryParamValue(url, "version", this._apiSvc.appReleaseVersion);

    if (this._currentUser?.id) {
      url = this.setQueryParamValue(url, "user", `${this._currentUser.id}`);
    }

    if (this._currentUser?.first_name) {
      url = this.setQueryParamValue(url, "first_name", this._currentUser.first_name);
    }

    if (this._currentUser?.last_name) {
      url = this.setQueryParamValue(url, "last_name", this._currentUser.last_name);
    }

    if (this._deviceSvc.getLanguageCode()) {
      url = this.setQueryParamValue(url, "language", this._deviceSvc.getLanguageCode().substring(0, 2).toUpperCase());
    }

    if (this._deviceSvc.getPlatform()) {
      url = this.setQueryParamValue(url, "platform", this._deviceSvc.getPlatform().toUpperCase());
    }

    if (this._deviceSvc.getDeviceId()) {
      url = this.setQueryParamValue(url, "device", this._deviceSvc.getDeviceId());
    }

    return url;
  }

  public getSafeUrl(url: string, withUserAttribs: boolean = true): SafeResourceUrl {

    url = withUserAttribs
      ? this.addUserAttributesToUrl(url)
      : url;

    return this._domSanitizer.bypassSecurityTrustResourceUrl(url);
  }

  public deleteQueryParamValue(url: string, key: string): string {
    return this.setQueryParamValue(url, key, null, true);
  }

  public setQueryParamValue(url: string, key: string, value: string, overwrite: boolean = false): string {

    if (!url) {
      return null;
    }

    const split = url.split('?');
    const base_url = split[0];

    const params_obj = {};

    if (split.length > 1) {

      split
        .slice(1).join("?")   //rebuild the querystring if there are multiple ?
        .split("&") //slice on querystring param divider
        .forEach(param => {

          const paramsplit = param.split("=");
          const k = paramsplit[0];
          const v = paramsplit.length > 1
            ? paramsplit.slice(1).join("=")
            : null;

          params_obj[k] = params_obj[k] || v;

        });
    }

    if (value == null) {
      delete params_obj[key];
    } else {

      value = this._httpEncoder.encodeValue(value);

      params_obj[key] = overwrite
        ? value
        : params_obj[key] || value;
    }

    //rebuild param string
    let params_str = "";
    Object.keys(params_obj).forEach((key, idx) => {
      params_str += idx == 0
        ? `?${key}=${params_obj[key] || ''}`
        : `&${key}=${params_obj[key] || ''}`;
    });

    return `${base_url}${params_str}`;
  }

  public santizeHtml(html: string): SafeHtml {
    return this._domSanitizer.bypassSecurityTrustHtml(html);
  }

  public isUrlExternal(url: string): boolean {
    return url?.indexOf(":") > 0
  }

  public isUrlVideoContent(url: string): boolean {
    return this.isUrlExternal(url) && url.toLocaleLowerCase().includes("youtube");
  }

  public async getExternalHtml(url:string, addUserAttribsToUrl:boolean = true): Promise<SafeHtml>{

    if(!url){
      return null;
    }

    if(addUserAttribsToUrl){
      url = this.addUserAttributesToUrl(url);
    }

    if (!this.isUrlExternal(url)){
      url = url.startsWith('/')
        ? `${this._apiSvc.endpoint_url()}${url}`
        : `${this._apiSvc.endpoint_url()}/${url}`;
    }

    try{
      this._logger.LogDebug("getExternalHtml", "requesting HTML", url);
      const response = await this._httpSvc.get(url,{ responseType: 'text' }).toPromise();
      return this.santizeHtml(response);
    } catch (ex){
      this._logger.LogError(ex, "getExternalHtml", "requesting HTML", url);
      return null;
    }
  }
}