import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { AlertController, LoadingController } from '@ionic/angular';
import { addYears, differenceInDays, getUnixTime } from 'date-fns';
import { TextHelper } from 'src/app/helpers/TextHelper';
import { KnowledgeBaseArticle } from 'src/app/models/KnowledgeBaseArticle';
import { IPrivacyDisplayOptions, PreferenceType } from 'src/app/models/PreferenceType';
import { TrackedEvent } from 'src/app/models/TrackedEvent';
import { User } from "src/app/models/User";
import { ApiService } from 'src/app/services/api.service';
import { IBrowserNavigationService } from 'src/app/services/browser-navigation/browser-navigation.service';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import { IPreferenceService } from 'src/app/services/preferences/preferences.service';
import { IReferralService } from 'src/app/services/referral/referral.service';
import { TermsService } from 'src/app/services/terms.service';
import { IUserSupportService } from 'src/app/services/user-support/user-support.service';
import { UserTrackingService } from 'src/app/services/user-tracking/user-tracking.service';
import { UserService } from 'src/app/services/user.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'profile',
  templateUrl: './profile.component.html',
  styleUrls: [
    '../onboarding.scss',
    './profile.component.scss'
  ],
})
export class ProfileComponent implements OnInit {

  private readonly _logger: Logger;
  private _referralCodeCheckCache: { [key: string]: boolean } = {};

  private _currentUser: User;
  private _privacyPrefs: IPrivacyDisplayOptions = null;

  public optOutDataSale: boolean;
  public limitDataUse: boolean;
  public canSubmit: boolean;

  public firstName: string;
  public firstNameIsValid: boolean;
  public firstNameIsFocused: boolean;
  public firstNameHasFocused: boolean;

  public lastName: string;
  public lastNameIsValid: boolean;
  public lastNameIsFocused: boolean;
  public lastNameHasFocused: boolean;

  public postalCode: string;
  public postalCodeIsValid: boolean;
  public postalCodeIsFocused: boolean;
  public postalCodeHasFocused: boolean;


  public phone: string;
  public phoneIsValid: boolean;
  public phoneIsFocused: boolean;
  public phoneHasFocused: boolean;


  public allowUpdateReferralCode: boolean;
  public referralCode: string;
  public referralCodeIsValid: boolean;
  public referralCodeIsFocused: boolean;
  public referralCodeHasFocused: boolean;
  public referralCodeErrorText: string;
  public referralCodeIsAvailable: boolean;

  public get appDisplayName(): string { return environment.appDisplayName; }


  @ViewChild('firstName')
  private _firstNameInput: ElementRef;


  constructor(
    logSvc: ILogService,
    private readonly _userSvc: UserService,
    private readonly _apiSvc: ApiService,
    private readonly _navSvc: IBrowserNavigationService,
    private readonly _loadingCtrl: LoadingController,
    private readonly _referralSvc: IReferralService,
    private readonly _prefSvc: IPreferenceService,
    private readonly _alertCtrl: AlertController,
    private readonly _userTrackingSvc: UserTrackingService,
    private readonly _userSupportSvc: IUserSupportService,
    private readonly _termsSvc: TermsService
  ) {
    this._logger = logSvc.getLogger("ProfileComponent");
    this._userSvc.currentUser$.subscribe(u => this.onUserChanged(u));
    this._prefSvc.subscribe(PreferenceType.Privacy, x => this._privacyPrefs = x?.value);
  }

  ngOnInit() { }

  ionViewWillEnter() {
  }

  private onUserChanged(user: User) {
    this._currentUser = user;

    if(this._currentUser){
      this.firstName = this._currentUser.first_name?.trim();
      this.lastName = this._currentUser.last_name?.trim();
      this.phone = this._currentUser.phone_number?.trim();
      this.postalCode = this._currentUser.postal_code?.trim();

      this.optOutDataSale = this._currentUser.opted_out_of_data_sale;
      this.limitDataUse = this._currentUser.opted_out_of_sensitive_data_use;
      const create_date:Date = this._currentUser.created_at;
      const now:Date = new Date(); 
      const diffDays = differenceInDays(now, create_date);
      this.allowUpdateReferralCode = !this._currentUser.has_referral_source && diffDays <= 10;

    } else {
      this.firstName = null;
      this.lastName = null;
      this.phone = null;
      this.postalCode = null;
      this.optOutDataSale = false;
      this.limitDataUse = false;
      this.allowUpdateReferralCode = true;
    }

    this.onChange();
  }

  private async confirm_privacy_option(title:string, acceptHandler: ()=>void){
    
    this._alertCtrl.create({
      header: "Are you sure you don't want us to use your data to benefit other workers?",
      message: "We only share data with organizations that support our worker-first mission, like transportaion planners, researchers, and policy makers.  Your shared data is always anonymized.",
      cssClass: "pop-up",
      buttons: [{
        text: "Learn more",
        role: "ok",
        handler: async () => {
          await this._userSupportSvc.openKnowledgeBaseArticle(KnowledgeBaseArticle.AppForGigWorkersByGigWorkers)
        }
      }, {
        text: title,
        role: "cancel",
        handler: acceptHandler.bind(this)
      }]
    })
    .then(x => x.present());
  }

  public optOutDataSaleToggle() {

    //If switching to on
    if(!this.optOutDataSale){
      const aYearAgo = getUnixTime(addYears(new Date(), -1));
      
      if(!this._privacyPrefs?.confirmed_optOutDataSale_on || this._privacyPrefs.confirmed_optOutDataSale_on < aYearAgo) {

        this.confirm_privacy_option("Opt Out of Data Sale", ()=>{ this.optOutDataSale = true; })
        .then(x=>{
          this._privacyPrefs = this._privacyPrefs || {};
          this._privacyPrefs.confirmed_optOutDataSale_on = getUnixTime(new Date());
          this._prefSvc.updatePreferenceValue(PreferenceType.Privacy, this._privacyPrefs, false);
        })
        return;
      }
    }

    this.optOutDataSale = !this.optOutDataSale;
    this.onChange();
  }

  public limitDataUseToggle() {

    //If switching to on
    if(!this.limitDataUse){
      const aYearAgo = getUnixTime(addYears(new Date(), -1));
      
      if(!this._privacyPrefs?.confirmed_limitDataUse_on || this._privacyPrefs.confirmed_limitDataUse_on < aYearAgo) {

        this.confirm_privacy_option("Limit Sensitive Data Use", ()=>{ this.limitDataUse = true; })
        .then(x=>{
          this._privacyPrefs = this._privacyPrefs || {};
          this._privacyPrefs.confirmed_limitDataUse_on = getUnixTime(new Date());
          this._prefSvc.updatePreferenceValue(PreferenceType.Privacy, this._privacyPrefs, false);
        })
        return;
      }
    }

    this.limitDataUse = !this.limitDataUse;
    this.onChange();
  }

  public firstNameFocusChanged(isFocused: boolean) {
    if (isFocused) {
      this.firstNameHasFocused = true;
    }
    this.firstNameIsFocused = isFocused;
    this.firstNameChanged(this.firstName);
  }

  public firstNameChanged(firstName: string) {
    this.firstName = firstName?.trim();
    this.onChange();
  }

  public lastNameFocusChanged(isFocused: boolean) {
    if (isFocused) {
      this.lastNameHasFocused = true;
    }
    this.lastNameIsFocused = isFocused;
    this.lastNameChanged(this.lastName);
  }

  public lastNameChanged(lastName: string) {
    this.lastName = lastName?.trim();
    this.onChange();
  }


  public postalCodeFocusChanged(isFocused: boolean) {
    if (isFocused) {
      this.postalCodeHasFocused = true;
    }
    this.postalCodeIsFocused = isFocused;
    this. postalCodeChanged(this.postalCode);
  }

  public  postalCodeChanged(postalCode: string) {
    
    postalCode = TextHelper.removeNonAlphaChar(postalCode)
    postalCode = postalCode?.replace(" ", "");
    this.postalCode = postalCode?.trim();

    this.onChange();
  }

  public phoneFocusChanged(isFocused: boolean) {
    if (isFocused) {
      this.phoneHasFocused = true;
    }
    this.phoneIsFocused = isFocused;
    this.phoneChanged(this.phone);
  }

  public phoneChanged(phone: string) {
    setTimeout(() => {
      this.phone = phone?.replace(/\D/g, '');
      this.onChange();
    }, 0);
  }

  public referralCodeFocusChanged(isFocused: boolean) {
    this._logger.LogDebug("referralCodeFocusChanged", isFocused);

    if (isFocused) {
      this.referralCodeHasFocused = true;
    }
    this.referralCodeIsFocused = isFocused;
    this.referralCodeChanged(this.referralCode);
  }

  public referralCodeChanged(referralCode: string) {
    this.referralCode = referralCode?.trim()?.toUpperCase();
    this._logger.LogDebug("referralCodeChanged", referralCode);

    const referralChk = this.referralCode;

    this.referralCodeIsValid = referralChk?.length == 4 || referralChk?.length == 0;

    //If not a valid referral code, no need to check
    if (!this.referralCodeIsValid || referralChk?.length == 0) {
      this.referralCodeIsAvailable = null;
      this.onChange();
      return;
    }

    if (this._referralCodeCheckCache[referralChk] != null) {
      this._logger.LogInfo("cache hit", referralChk, this._referralCodeCheckCache[referralChk]);
      this.referralCodeIsAvailable = this._referralCodeCheckCache[referralChk];
      this.onChange();
      return;
    }

    this._logger.LogDebug("referralCodeChanged", `Checking if ${referralChk} is available`);

    this.referralCodeIsAvailable = null;

    this._referralSvc.GetReferralSourceByCode(referralChk)
      .then(response => {
        this._logger.LogInfo(response);
        if (!response) {
          return;
        } else {
          this._referralCodeCheckCache[response.referralCode] = response.referralSource?.is_active || false;
        }

        if (response.referralCode == referralChk) {
          this._logger.LogInfo("ref match", referralChk, this._referralCodeCheckCache[referralChk]);
          this.referralCodeIsAvailable = this._referralCodeCheckCache[referralChk];
          this.onChange();
        }
      });
  }

  private onChange() {

    this.referralCodeErrorText = null;

    this.firstNameIsValid = this.firstName?.trim()?.length > 0;
    this.lastNameIsValid = this.lastName?.trim()?.length > 0;
    this.phoneIsValid = !this.phone || this.phone.trim() == "" || TextHelper.isPhoneNumberValid(this.phone);
    this.postalCodeIsValid = TextHelper.isValidPostalCode(this.postalCode?.trim());
    this.referralCodeIsValid = this.referralCode?.length == 4 || this.referralCode?.length == 0 || !this.referralCode;

    if (this.referralCode) {
      if (this.referralCodeIsValid && this.referralCodeIsAvailable == false) {
        this.referralCodeErrorText = `referral code ${this.referralCode} was not found`;
      } else if (this.referralCodeHasFocused && !this.referralCodeIsValid) {
        this.referralCodeErrorText = "please enter a 4-character referral code";
      }
    }

    this.canSubmit = this.firstNameIsValid &&
      this.lastNameIsValid &&
      this.phoneIsValid &&
      this.postalCodeIsValid &&
      this.referralCodeIsValid &&
      this.referralCodeIsAvailable != false;
  }

  public async onSubmit() {

    if(!this.canSubmit){
      return;
    }

    const spinnerCtrl = await this._loadingCtrl.create({
      message: "One moment please...",
    });

    spinnerCtrl.present();

    const u = User.parseUser({...this._currentUser});
    u.first_name = this.firstName;
    u.last_name = this.lastName;
    u.phone_number = this.phone;
    u.postal_code = this.postalCode;
    u.opted_out_of_data_sale = this.optOutDataSale;
    u.opted_out_of_sensitive_data_use = this.optOutDataSale || this.limitDataUse;

    if (this.allowUpdateReferralCode && this.referralCode) {
      u["referral_code"] = this.referralCode;
    }

    await this._userSvc.updateUser(u)
      .then(async () => {
        await this._userTrackingSvc.captureEvent(TrackedEvent.onboarding_finish)
        await this._userTrackingSvc.captureEvent(TrackedEvent.onboarding_finish_without_argyle)
        await this._navSvc.requestNavigation(false, false, false);
      })
      .finally(()=>{
        spinnerCtrl.dismiss();
      });
  }

  public async onLogout() {
    await this._apiSvc.removeAuthToken();
  }

  public async onPrivacyClick(){
    await this._termsSvc.showPrivacyPolicy();
  }
}
