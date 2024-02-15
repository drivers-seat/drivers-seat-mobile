import { Injectable } from '@angular/core';
import { User } from "src/app/models/User";
import { ILogService } from '../logging/log.service';
import { Logger } from '../logging/logger';
import { IUserTrackingProvider } from './IUserTrackingProvider';
import OneSignal from 'onesignal-cordova-plugin';
import OSNotification from 'onesignal-cordova-plugin/dist/OSNotification';
import { ApiService } from '../api.service';
import { environment } from 'src/environments/environment';
import { IDeviceService } from '../device/device.service';
import { AlertController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class OneSignalUserTrackingProvider implements IUserTrackingProvider {

  private readonly _logger: Logger;
  private _isInitialized: boolean = false;

  constructor(
    logSvc: ILogService,
    private readonly _apiSvc: ApiService,
    private readonly _deviceSvc: IDeviceService,
    private readonly _alertSvc: AlertController
  ) {
    this._logger = logSvc.getLogger("OneSignalUserTrackingProvider");
  }

  public async initialize(isCordovaAvailable: boolean): Promise<void> {

    if (!isCordovaAvailable) {
      return;
    }

    if (!environment.oneSignal?.appId){
      this._logger.LogInfo("Bypassing Onesignal, invalid configuration")
      this._isInitialized = false;
      return;
    }

    try {

      
      OneSignal.setAppId(environment.oneSignal.appId);

      //iOS devices don't show the notification when the user is using the app
      //instead handle the event by showing an alert dialog.
      OneSignal.setNotificationWillShowInForegroundHandler(event=>{
        const notification = event.getNotification();
        this.handleInAppNotification(notification);
        event.complete(null);
      });

      //If the user clicks on the notification and opens the app, show the notification
      //in a modal so the can see all the details.
      OneSignal.setNotificationOpenedHandler(event=> {
        const notificaiton = event.notification;
        this.handleInAppNotification(notificaiton);
      });

      OneSignal.promptForPushNotificationsWithUserResponse(accepted => {
        this._logger.LogInfo("promptForPushNotificationResponseHandler", accepted);
      })

      this._isInitialized = true;
    } catch (ex) {
      this._logger.LogError(ex, "initialize");
      this._isInitialized = false;
    }
  }

  public async disconnectUser(): Promise<void> {

    if(!this._isInitialized){
      return;
    }

    OneSignal.removeExternalUserId(result => {
      this._logger.LogInfo("removeExternalUserId", "result", result);
    });

    OneSignal.logoutEmail();
    OneSignal.logoutSMSNumber();
  }

  public async captureEvent(event: string, extraInfo: any): Promise<void> {
    //No Op
  }

  public async updateUserInfo(user: User): Promise<void> {

    if(!this._isInitialized){
      return;
    }

    if (!user){

      OneSignal.logoutEmail();
      OneSignal.logoutSMSNumber();
      return;
    } 
    
    if (user.opted_out_of_push_notifications) {

      OneSignal.unsubscribeWhenNotificationsAreDisabled(true);
      OneSignal.removeExternalUserId(result => {
        this._logger.LogInfo("removeExternalUserId", "result", result);
      });

      OneSignal.logoutEmail();
      OneSignal.logoutSMSNumber();
      return;
    }

    if(user?.email){
      OneSignal.setEmail(user.email)
    } else {
      OneSignal.logoutEmail();
    }

    if(user?.phone_number){
      OneSignal.setSMSNumber(`+1{user.phone_number}`);
    } else {
      OneSignal.logoutSMSNumber();
    }

    const oneSignalUser = this.getOneSignalUserTags(user);
    
    this._logger.LogInfo("updateUserInfo", "OneSignal Tags", oneSignalUser);

    OneSignal.sendTags(oneSignalUser);
  }

  private getOneSignalUserTags(user){
    
    const propsToSend = [
      "first_name",
      "last_name",
      "focus_group",
      "gender",
      "postal_code"
    ];

    const oneSignalUser = {};

    propsToSend
      .forEach(prop => {
        if (user[prop] == null || user[prop] == undefined) {
          return;
        }

        const strVal = `${user[prop]}`.trim();
        if (strVal == "") {
          return;
        }

        oneSignalUser[prop] = strVal;
      });

    oneSignalUser["langCode"] = this._deviceSvc.getLanguageCode();
    oneSignalUser["app_version"] = this._apiSvc.appReleaseVersion;

    if(user.ethnicity?.length > 0){
      oneSignalUser["ethnicity"] = user.ethnicity[0];
    }

    return oneSignalUser;
  }

  public async registerUser(userIdForTracking: string, user: User): Promise<void> {
    
    if(!this._isInitialized){
      return;
    }
    OneSignal.setExternalUserId(`${user.id}`);
  }

  public async setScreenName(screenName: string, eventData?: any): Promise<void> {
    //NoOp
  }

  // if the app is open, capture the notification and show it in the app instead.
  private async handleInAppNotification(notification : OSNotification){

    const alert = await this._alertSvc.create({
      header:  notification.title,
      subHeader:notification.subtitle,
      message: notification.body,
      animated: true,
      cssClass: "pop-up",   //in global.scss
      buttons: [
        {
          text: "Ok",
          role: "cancel"
        }
      ]
    })

    await alert.present();
  }

}
