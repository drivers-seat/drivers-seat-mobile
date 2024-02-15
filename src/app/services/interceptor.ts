import { HttpInterceptor, HttpRequest, HttpErrorResponse, HttpResponse } from '@angular/common/http/';
import { HttpHandler } from '@angular/common/http';
import { Events } from './events.service';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';
import 'rxjs/add/observable/throw';
import { debounceTime } from 'rxjs/operators';
import * as Sentry from "@sentry/capacitor";
import { ILogService } from './logging/log.service';
import { Logger } from './logging/logger';
import { IDeviceService } from './device/device.service';
import { environment } from 'src/environments/environment';
import { ILocationTrackingService } from './location-tracking/location-tracking.service';
import { AppUpdatedRequiredInfo } from '../models/AppUpdatedRequiredInfo';
import { MaintenanceModeInfo } from '../models/MaintenanceModeInfo';

@Injectable()
export class APIHttpInterceptor implements HttpInterceptor {

  private readonly _logger: Logger;

  private _inMaintenanceMode: boolean = false;

  constructor(
    logSvc: ILogService,
    public events: Events,
    private readonly _apiSvc: ApiService,
    private readonly _deviceSvc: IDeviceService,
    private readonly _locationSvc: ILocationTrackingService
  ) {
    this._logger = logSvc.getLogger("APIHttpInterceptor");
  }

  private handleNonMaintenance() {

    //if we're not in maintenance mode nothing to do
    if (!this._inMaintenanceMode) {
      return;
    }

    this._logger.LogDebug("handleNonMaintenance", "clearing maintence flag");

    this._inMaintenanceMode = false;
    this.events.publish("maintenanceEnd")
  }

  private handleMaintenanceResponse(response: HttpErrorResponse) {

    if (this._inMaintenanceMode) {
      return;
    }

    const data = response.error?.errors;
    const model = this.parseMaintenanceModeResponse(data);
    this._inMaintenanceMode = true;
    this.events.publish("maintenanceStart", model);
  }

  intercept(req: HttpRequest<any>, next: HttpHandler) {

    //capture this so that when the response comes in, 
    //we can decide what to do with the auth token.
    const requestWasGhosted = this._apiSvc.isGhosting;
    const api_url = this._apiSvc.endpoint_url().toLowerCase()

    let newReq = req;
    if (req.url.indexOf(environment.argyle.url) > -1) {
      //skip adding headers to argyle requests
    } else {
      newReq = req.clone({
        headers: req.headers
          .set('Authorization', `${this._apiSvc.authToken()}`)
          .set('dsc-device-id', `${this._deviceSvc.getDeviceId()}`)
          .set('dsc-device-platform', `${this._deviceSvc.getPlatform()}`)
          .set('dsc-device-os', `${this._deviceSvc.getOSVersion()}`)
          .set('dsc-device-language', `${this._deviceSvc.getLanguageCode()}`)
          .set('dsc-app-version', `${this._apiSvc.appReleaseVersion}`)
          .set('dsc-device-name', `${this._deviceSvc.getDeviceName()}`)
          .set('dsc-location-tracking-config-status', `${this._locationSvc.authTrackingStatus}`)
      });
    }

    return next.handle(newReq).pipe(debounceTime(30000)).map((event: HttpResponse<any>) => {

      if (this._apiSvc.isGhosting) {
        if (event.url.indexOf('ghost') > -1) {
          if (event.headers) {
            const authToken = event.headers.get('Authorization');
            this._apiSvc.ghostToken = authToken;
            this._logger.LogDebug("Ghosting", `IsGhosting=${this._apiSvc?.isGhosting}`, `GhostToken=${this._apiSvc?.ghostToken}`);
          }
        }
      } else {
        if (event.headers && !requestWasGhosted) {
          let authToken = event.headers.get('Authorization');
          if (authToken) {
            this._apiSvc.saveAuthToken(authToken);
          }
        }
      }

      //This would represent a successful request to the DSC API,
      //so it is safe to cancel maintenance mode
      if (event.url.toLowerCase().indexOf(api_url) >= 0) {
        this.handleNonMaintenance();
      }

      return event;
    })
      .catch((err: any, caught) => {
        // If not our  API call, throw
        if (newReq.url.toLowerCase().indexOf(api_url) < 0) {
          return Observable.throwError(err);
        }

        this._logger.LogDebug("API Error", err, caught);

        if (err instanceof HttpErrorResponse) {

          switch (err.status) {
            // Unauthorized, kick to login
            case 401:
              this._apiSvc.removeAuthToken(true);
              break;

            //App Update Required
            case 426:
              const data = err.error?.errors;
              const model = this.parseUpdateRequiredResponse(data);
              this.events.publish("appUpdateRequired", model)
              return;

            case 503:
              this.handleMaintenanceResponse(err);
              return;

            // User has not accepted required Terms of Service
            case 451:
              this.events.publish('termsOutOfDate');
              break;
          }

          // This indicates an actual response from the DSC API server
          // that is not a 500+ error.  If unable to contact the server
          // err.status == 0
          if (err.status >= 100 && err.status < 500) {
            this.handleNonMaintenance();
          }

          return Observable.throwError(err);
        }

        // What else should we do here?
        Sentry.captureException(err);
        return Observable.throwError(err);
      });
  }


  private parseUpdateRequiredResponse(data: any): AppUpdatedRequiredInfo {

    const model = new AppUpdatedRequiredInfo();

    model.calling_os = data["calling_os"];
    model.calling_version = data["calling_version"];
    model.minimum_version = data["minimum_version"];
    model.store_url = data["store_url"];
    model.title = data["title"];
    model.message = data["message"];

    return model;
  }

  private parseMaintenanceModeResponse(data: any): MaintenanceModeInfo {
    const model = new MaintenanceModeInfo();
    model.admin_only = data["admin_only"] == true;
    model.message = data["message"];
    model.title = data["title"];
    return model;
  }
}
