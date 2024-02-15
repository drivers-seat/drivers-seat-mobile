import { Injectable } from '@angular/core';
import { Device, DeviceInfo } from '@capacitor/device'
import { BehaviorSubject } from 'rxjs';
import { ILogService } from '../logging/log.service';
import { Logger } from '../logging/logger';

export abstract class IDeviceService {

  public abstract isReady$: BehaviorSubject<boolean>;
  public abstract getLanguageCode(): string;
  public abstract getPlatform(): "ios" | "android" | "web";
  public abstract getDeviceModel(): string;
  public abstract getOSVersion(): string;
  public abstract getDeviceInfoText(): string;
  public abstract getDeviceId(): string;
  public abstract getDeviceName(): string;

  public abstract get is_iOS(): boolean;
  public abstract get is_Android(): boolean;
  public abstract get is_Web(): boolean;
  public abstract get is_Emulator(): boolean;
}

@Injectable({
  providedIn: 'root'
})
export class DeviceService implements IDeviceService {

  public readonly isReady$: BehaviorSubject<boolean> = new BehaviorSubject(false);
  private readonly _logger: Logger;
  private _languageCode: string;
  private _deviceInfo: DeviceInfo;
  private _deviceModel: string;
  private _deviceInfoText: string;
  private _deviceUuid: string;

  constructor(
    loggerFactory: ILogService
  ) {

    this._logger = loggerFactory.getLogger("DeviceService");
    this.initialize();
  }

  private async initialize() {

    const lc = await Device.getLanguageCode();
    this._logger.LogInfo("Language Code", lc);
    this._languageCode = lc.value;


    const deviceInfo = await Device.getInfo()
    this._logger.LogInfo("Device Info", deviceInfo);
    this._deviceInfo = deviceInfo;

    const deviceId = await Device.getId();
    this._logger.LogInfo("Device Id", deviceId);
    this._deviceUuid = deviceId?.identifier;

    this.isReady$.next(true);
  }

  public getDeviceId(): string {
    return this._deviceUuid;
  }

  public getLanguageCode(): string {
    return this._languageCode;
  }

  public getPlatform(): "ios" | "android" | "web" {
    return this._deviceInfo?.platform;
  }

  public getOSVersion(): string {
    this._logger.LogDebug("getOSVersion");
    return this._deviceInfo?.osVersion;
  }

  public getDeviceName(): string {
    return this._deviceInfo?.name;
  }

  public getDeviceModel(): string {

    this._logger.LogDebug("getDeviceModel");
    if (!this._deviceModel) {

      const vals = [
        this._deviceInfo?.manufacturer,
        this._deviceInfo?.model,
      ]
        .filter(x => x != null && x != "");

      this._deviceModel = vals.length == 0
        ? null
        : vals.join(": ");
    }

    return this._deviceModel;
  }

  public getDeviceInfoText(): string {

    if (!this._deviceInfoText) {

      var vals = [
        this.getDeviceModel(),
        this.getPlatform(),
      ]
        .filter(x => x != null && x != "");

      const osVer = this.getOSVersion();
      if (osVer) {
        vals.push(osVer);
      }

      this._deviceInfoText = vals.length == 0
        ? null
        : vals.join(", ");
    }

    return this._deviceInfoText;
  }

  private _isIos: boolean = null;

  public get is_iOS(): boolean {
    return this.getPlatform() == "ios";
  }

  public get is_Android(): boolean {
    return this.getPlatform() == "android";
  }

  public get is_Web(): boolean {
    return this.getPlatform() == "web";
  }

  public get is_Emulator(): boolean {
    return this._deviceInfo?.isVirtual;
  }

}
