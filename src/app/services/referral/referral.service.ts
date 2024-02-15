import { Injectable } from '@angular/core';
import { ReferralSource, ReferralType } from 'src/app/models/ReferralType';
import { ILogService } from '../logging/log.service';
import { SMS, SmsOptions } from '@awesome-cordova-plugins/sms/ngx';
import { Logger } from '../logging/logger';
import { UserService } from '../user.service';
import { User } from "src/app/models/User";
import { ApiService } from '../api.service';
import { HttpClient } from '@angular/common/http';
import { AlertController, Platform } from '@ionic/angular';
import { UserTrackingService } from '../user-tracking/user-tracking.service';
import { TrackedEvent } from 'src/app/models/TrackedEvent';
import { environment } from 'src/environments/environment';

export abstract class IReferralService {
  abstract GenerateSMSReferral(referralType: ReferralType): Promise<void>;
  abstract GetReferralSourceByCode(referralCode: string): Promise<{ referralCode: string, referralSource: ReferralSource }>;
  abstract GetReferralSourceByType(referralType: ReferralType): Promise<ReferralSource>;
}

@Injectable({
  providedIn: 'root'
})
export class ReferralService extends IReferralService {

  private readonly _logger: Logger;
  private readonly _smsOptions: SmsOptions;

  private _currentUser: User;
  private readonly _isMobileDevice: boolean;

  private _referralSources: Map<ReferralType, ReferralSource> = new Map<ReferralType, ReferralSource>();

  public get appDisplayName(): string { return environment.appDisplayName; }

  constructor(
    logSvc: ILogService,
    platformSvc: Platform,
    private readonly _smsSvc: SMS,
    private readonly _userSvc: UserService,
    private readonly _apiSvc: ApiService,
    private readonly _httpClient: HttpClient,
    private readonly _alertCtrl: AlertController,
    private readonly _userTrackSvc: UserTrackingService

  ) {
    super();
    this._logger = logSvc.getLogger("ReferralService");

    this._isMobileDevice = platformSvc.is("cordova");

    this._smsOptions = {
      replaceLineBreaks: true,
      android: {
        intent: "INTENT"
      }
    }

    this._userSvc.currentUser$.subscribe(u => {
      if (u?.id != this._currentUser?.id) {
        this._logger.LogInfo("User Changed", "clearing cache");
        this._referralSources = new Map<ReferralType, ReferralSource>();
      }
      this._currentUser = u;
    });
  }

  public async GetReferralSourceByType(referralType: ReferralType): Promise<ReferralSource> {

    if (!this._currentUser) {
      this._logger.LogWarning("No User Available");
      return null;
    }

    if (!this._referralSources.has(referralType)) {

      await this._httpClient.get(`${this._apiSvc.url()}/referral_source/show?referral_type=${referralType}`).toPromise()
        .then(data => {
          const referralSource = data["data"]
          if (referralSource) {
            this._referralSources.set(referralType, referralSource)
          }
        });
    }

    return this._referralSources.get(referralType);
  }
ß
  public async GetReferralSourceByCode(referralCode: string): Promise<{ referralCode: string, referralSource: ReferralSource }>{
    const referralSource = await this._httpClient.get<ReferralSource>(`${this._apiSvc.url()}/referral_source/lookup/${referralCode}`).toPromise()
      .then(data => {
        const rs = data["data"];
        return { referralCode: rs.referral_code, referralSource: rs }; 
      })
      .catch(err => {
        if (err.status === 404) {
          return { referralCode: referralCode, referralSource: null};
        }
        throw err;
      });

    return referralSource;
  }

  private GetReferralText(referralType: ReferralType, referralCode: string): string {

    switch (referralType) {

      case ReferralType.FromHourlyPayAnalytics:
        return `https://www.driversseat.co/download_redirect

${this.appDisplayName} helps me figure out which times and platforms I should use in my area to earn more money!  

Sign up to maximize your rideshare and delivery earnings today. 

Remember to use the referral code ${referralCode} when signing up!`;
        
      default:
        return `https://www.driversseat.co/download_redirect

${this.appDisplayName} is the app I was telling you about! Sign up to maximize your rideshare and delivery earnings today. 

Remember to use the referral code ${referralCode} when signing up!`;
    }
  }

  public async GenerateSMSReferral(referralType: ReferralType): Promise<void> {

    if (this._apiSvc.isGhosting){
      this._alertCtrl.create({
        header: "Not Available",
        message: "This function is not availbale while ghosting",
        buttons: [
          {
            text: "Ok",
            role: "cancel"
          }
        ]
      }).then(x => x.present());
      return;
    }

    if (!this._isMobileDevice) {
      this._alertCtrl.create({
        header: "Not Available",
        message: "This function is not availbale on this device",
        buttons: [
          {
            text: "Ok",
            role: "cancel"
          }
        ]
      }).then(x => x.present());
      return;
    }

    var src = await this.GetReferralSourceByType(referralType)
    const txt = this.GetReferralText(referralType, src.referral_code);
    this._logger.LogInfo(src, txt);


    this._smsSvc.send("", txt, this._smsOptions)
      .then(() => {
        this._userTrackSvc.captureEvent(TrackedEvent.referral_generate_sms, {
          referral_type: referralType,
          referral_code: src.referral_code,
        });
      })
      .catch((err) => {
        this._logger.LogError(err, "Unable to send SMS");
      });
  }

  public async SetReferralSource(referralCode: string): Promise<boolean> {

    await this._httpClient.post(`${this._apiSvc.url()}/referral`,
      { referral_code: referralCode },
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } })
      .toPromise();

    return true;
  }
}
