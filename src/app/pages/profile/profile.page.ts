import { Component, ElementRef, ViewChild } from '@angular/core';
import { Validators, FormBuilder, FormGroup } from '@angular/forms';
import { AlertController, LoadingController, ToastController, IonContent } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { UserService } from '../../services/user.service';
import { UserTrackingService } from 'src/app/services/user-tracking/user-tracking.service';
import { TrackedEvent } from 'src/app/models/TrackedEvent';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import { addYears, differenceInDays, getUnixTime } from 'date-fns';
import { IBrowserNavigationService } from 'src/app/services/browser-navigation/browser-navigation.service';
import { User } from 'src/app/models/User';
import { IPreferenceService } from 'src/app/services/preferences/preferences.service';
import { IPrivacyDisplayOptions, PreferenceType } from 'src/app/models/PreferenceType';
import { IUserSupportService } from 'src/app/services/user-support/user-support.service';
import { KnowledgeBaseArticle } from 'src/app/models/KnowledgeBaseArticle';
import { TermsService } from 'src/app/services/terms.service';
import { environment } from 'src/environments/environment';
import { IDeviceService } from 'src/app/services/device/device.service';

type tab = "account" | "personal" | "vehicle" | "privacy" | "referral";

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: [
    './profile.page.scss'],
})
export class ProfilePage {
  @ViewChild('content') content: IonContent;

  public get is_iOS():boolean{
    return this._deviceSvc.is_iOS;
  }

  public get isAndroid():boolean{
    return this._deviceSvc.is_Android;
  }


  public personalForm: FormGroup;
  public showTerms;
  public ethnicities = {
    'African American or Black': false,
    'Latino or Hispanic': false,
    'Asian American': false,
    'Native American': false,
    'Middle Eastern American': false,
    'Pacific Islander American': false,
    'Caucasian, White or European American': false
  };
  public ethnicitiesList = [
    'African American or Black',
    'Latino or Hispanic',
    'Asian American',
    'Native American',
    'Middle Eastern American',
    'Pacific Islander American',
    'Caucasian, White or European American'
  ];
  public myEthnicities = [];
  public otherEthnicities: string;
  public vehicle_year;

  public activeTab: tab = "account";
  public allowUpdateReferral: boolean;

  private readonly _logger: Logger;

  public get appDisplayName(): string { return environment.appDisplayName; }

  private _privacyPrefs: IPrivacyDisplayOptions = null;

  constructor(
    loggerSvc: ILogService,
    private userService: UserService,
    private alertCtrl: AlertController,
    private formBuilder: FormBuilder,
    private api: ApiService,
    private toastCtrl: ToastController,
    private route: ActivatedRoute,
    private readonly _userTrackingSvc: UserTrackingService,
    private readonly _alertCtrl: AlertController,
    private readonly _loadingCtrl: LoadingController,
    private readonly _browserNavSvc: IBrowserNavigationService,
    private readonly _prefSvc: IPreferenceService,
    private readonly _userSupportSvc: IUserSupportService,
    private readonly _termsSvc: TermsService,
    private readonly _deviceSvc: IDeviceService
  ) {
    this._logger = loggerSvc.getLogger("ProfilePage");
    this._prefSvc.subscribe(PreferenceType.Privacy, x => this._privacyPrefs = x?.value);
  }

  ngOnInit() {

    this.route.queryParams
      .subscribe(params => {
        this.setTab(params?.pageTo || "account");
      });
  }

  ionViewWillEnter() {
    
    const user = this.userService.currentUser;

    if(!user){
      this._logger.LogWarning("ionViewWillEnter", "current user NULL");
      return;
    }

    const now:Date = new Date(); 
    const diffDays = differenceInDays(now, user?.created_at);
    this.allowUpdateReferral = !user.has_referral_source && diffDays <= 10;

    let ethnicities = user.ethnicity || []
    let otherEthnicities = [];
    for (let i = 0; i < ethnicities.length; i++) {
      let ethnicity = ethnicities[i];
      if (ethnicity === 'African American or Black'
        || ethnicity === 'Latino or Hispanic'
        || ethnicity === 'Asian American'
        || ethnicity === 'Native American'
        || ethnicity === 'Middle Eastern American'
        || ethnicity === 'Pacific Islander American'
        || ethnicity === 'Caucasian, White or European American') {
        this.ethnicities[ethnicity] = true;
        this.myEthnicities.push(ethnicity);
      } else {
        otherEthnicities.push(ethnicity);
      }
    }
    this.otherEthnicities = otherEthnicities.join(', ');


    let vehicle_type = user.vehicle_type;
    let ownership;
    let program;
    let other;
    this.vehicle_year = user.vehicle_year?.toString();
    
    // grandfathered vehicle types
    if (!vehicle_type && (user.vehicle_make || user.vehicle_model)) {
      vehicle_type = 'car';
    }
    if (user.car_ownership) {
      if (user.car_ownership.toLowerCase().indexOf('own') >= 0) {
        ownership = 'own';
      } else if (user.car_ownership.toLowerCase().indexOf('lease') >= 0) {
        ownership = 'lease';
      } else if (user.car_ownership.toLowerCase().indexOf('rent') >= 0) {
        ownership = 'rent';
      }

      if (ownership === 'rent') {
        if (user.car_ownership.toLowerCase().indexOf('uber') >= 0) {
          program = 'uber';
        } else if (user.car_ownership.toLowerCase().indexOf('lyft') >= 0) {
          program = 'lyft';
        } else {
          program = 'other';
          // is in format: 'rent - enterprise'
          let start = user.car_ownership.indexOf('-');
          other = user.car_ownership.substring(start + 2);
        }
      }
    }

    this.otherCountry = undefined;

    if (user.country != "USA") {
      this.country = "Other";
      this.otherCountry = user.country;
    } else {
      this.country = user.country;
    }

    this.personalForm = this.formBuilder.group({
      first_name: [user.first_name],
      last_name: [user.last_name],
      email: [user.email, Validators.compose([Validators.required, Validators.email])],
      phone_number: [user.phone_number],
      vehicle_type: [vehicle_type, Validators.compose([Validators.required])],
      vehicle_make: [user.vehicle_make, Validators.compose([Validators.required])],
      vehicle_model: [user.vehicle_model, Validators.compose([Validators.required])],
      vehicle_year: [this.vehicle_year, Validators.compose([Validators.required])],
      engine_type: [user.engine_type, Validators.compose([Validators.required])],
      car_ownership: [ownership],
      rental_program: [program],
      other_rental: [other],
      optOutDataSale: [user.opted_out_of_data_sale],
      limitDataUse: [user.opted_out_of_sensitive_data_use],
      country: [this.country],
      otherCountry: [this.otherCountry],
      zipCode: [user.postal_code],
      timezone: [user.timezone],
      gender_identity: [user.gender],
      ethnicity: [this.myEthnicities],
      push_noti_opt_out: [user.opted_out_of_push_notifications],
      is_beta: [user.is_beta]
    });
  }

  ionViewDidEnter() {
  }

  public cancel() {
    this._browserNavSvc.navigateBack();
  }

  private _country: string;

  get country(): string {
    return this._country;
  }

  set country(value: string) {
    this._country = value;
  }

  private _otherCountry: string;

  get otherCountry(): string {
    return this._otherCountry;
  }

  set otherCountry(value: string) {
    this._otherCountry = value;
  }

  validateZipCode(): boolean {
    let ret: boolean = false;

    if (this.personalForm.value.zipCode != undefined) {
      if (this.personalForm.value.country == "USA") {
        ret = this.personalForm.value.zipCode.length === 5 && Number(this.personalForm.value.zipCode) <= 99999;
      }
      else {
        ret = String(this.personalForm.value.zipCode).length < 8;
      }
    }

    return ret;
  }

  selectEthnicity(ethnicity) {
    this.myEthnicities.push(ethnicity);
    this.ethnicities[ethnicity] = !this.ethnicities[ethnicity];
  }

  setFocus(event, element = null) {
    if (element) {
      element.setFocus();
    }
  }

  public async saveChanges() {
    
    if (this.api.isGhosting) {
      this.presentToast('Ghost mode - not saving');
      this.cancel();
      return;
    }

    const user = User.parseUser({
      ...this.userService.currentUser
    });

    let form = this.personalForm.value;

    let phone = null;
    if (form.phone_number) {
      phone = form.phone_number.toString();
    }

    this._logger.LogDebug("personalForm", this.personalForm);

    user.first_name = form.first_name;
    user.last_name = form.last_name;
    user.email = form.email;
    user.phone_number = phone;
    user.vehicle_type = form.vehicle_type;
    user.vehicle_make = form.vehicle_make;
    user.vehicle_model = form.vehicle_model;
    user.vehicle_year = parseInt(form.vehicle_year);
    user.engine_type = form.engine_type;
    user.postal_code = form.zipCode;
    user.timezone = form.timezone;
    user.ethnicity = this.processEthnicities(form.ethnicity);
    user.gender = form.gender_identity;
    user.opted_out_of_push_notifications = form.push_noti_opt_out;
    user.is_beta = form.is_beta;

    if (form.car_ownership) {
      if (form.car_ownership === 'rent') {
        user.car_ownership = 'rent - ';
        if (form.other_rental) {
          user.car_ownership += form.other_rental;
        } else {
          user.car_ownership += form.rental_program;
          this.personalForm.value.other_rental = null;
        }
      } else {
        user.car_ownership = form.car_ownership;
        this.personalForm.value.other_rental = null;
        this.personalForm.value.rental_program = null;
      }
    }

    if (form.country == "Other") {
      user.country = form.otherCountry;
    }
    else {
      user.country = form.country;
    }

    user.opted_out_of_data_sale = form.optOutDataSale;
    user.opted_out_of_sensitive_data_use = user.opted_out_of_data_sale || form.limitDataUse;

    if (form.password) {
      user.password = form.password;
    }

    if(this.allowUpdateReferral && this.referralCode && this.referralCode.trim() != ""){
      user["referral_code"] = this.referralCode.trim().toUpperCase();
    }

    if(!user.isRequiredProfileComplete){
      const validationMessages = user.requiredProfileValidationMessages;
      let message = "";
      for (var key in validationMessages) {
        message += key.replace('_',' ') + ': ' + validationMessages[key].join(", ") + '\n';
      }
      await this.presentAlert('Cannot Save Changes', message);
      return;
    }


    const spinnerCtrl = await this._loadingCtrl.create({
      message: "Saving your profile...",
    });

    spinnerCtrl.present();

    await this.userService.updateUser(user, false)
      .then(async u => {

        await this._userTrackingSvc.captureEvent(TrackedEvent.update_profile);
        this._logger.LogInfo("Captured Event - Update Profile");
        await this.presentToast("Your profile changes have been saved!");
        
        this._browserNavSvc.navigateBack();
      })
      .catch(async err => {
        let message = "";
        for (var key in err.error.errors) {
          let error = err.error.errors[key];
          message += key + ' ' + error + '\n';
        }
        await this.presentAlert('Error updating account', message);
      })
      .finally(()=>{
        spinnerCtrl?.dismiss();
      });
  }

  processEthnicities(eths) {
    if (this.otherEthnicities) {
      return eths.concat(this.otherEthnicities);
    } else {
      return eths;
    }
  }

  public transitionAllowed: boolean = true;

  public requestData() {
    const userId = this.userService.currentUser?.id;

    if(!userId){
      return;
    }

    this.userService.requestData(userId)
      .then(r => {
        this.presentAlert('Request sent!', "We'll be in contact soon");
      }).catch(err => {
        let message = "";
        for (var key in err.error.errors) {
          let error = err.error.errors[key];
          message += key + ' ' + error + '\n';
        }
        this.presentAlert('Error updating account', message);
      })
  }

  public async deleteAccount() {

    if (this.userService.isUsingGhost) {
      this._logger.LogWarning("deleteUser", "Ignored during ghost session");
      window.alert("Unable to delete account while ghosting");
      return;
    }

    const alert = await this._alertCtrl.create({
      header: "Delete your account?",
      message: `Are you sure that you'd like to delete your ${this.appDisplayName} Account?  This cannot be undone.`,
      cssClass: "pop-up",   //in global.scss
      buttons: [
        {
          text: "Yes, delete my account",
          handler: (v) => {
            this.deleteAccountExec();
          }
        },
        {
          text: "Cancel",
          role: "cancel"
        }
      ]
    });

    await alert.present();

  }

  private deleteAccountExec() {
    if (this.userService.isUsingGhost) {
      this._logger.LogWarning("deleteUser", "Ignored during ghost session");
      return;
    }
    this.userService.deleteUser(this.userService.currentUser.id);
  }

  public tooltipVisible: boolean = false;
  getTooltipOutside(event: Event) {
    if (this.tooltipVisible) {
      this.tooltipVisible = false;
    }
  }
  public tooltipOpen() {
    this.tooltipVisible = true;
  }

  public async ethnicityHelpOpen() {

    const alert = await this._alertCtrl.create({
      header: "Share your ethnicity?",
      message: `We invite users to optionally share ethnic background information. By sharing this information, you're helping ${this.appDisplayName} learn whether gig work opportunities are fairly offered to all communities.`,
      cssClass: "pop-up",   //in global.scss
      buttons: [
        {
          text: "Ok",
        }
      ]
    });

    await alert.present();
  }

  public setTab(tab:tab) {

    switch(tab) {
      case 'referral':
        if(!this.allowUpdateReferral){
          this.setTab('account');
          return;
        }

      default:
        this.activeTab = tab;
        this._userTrackingSvc.setScreenName(`profile/${tab}`)
        break;
    }

    this.content?.scrollToTop();
  }

  async presentAlert(header, message) {
    const alert = await this.alertCtrl.create({
      cssClass: 'pop-up',
      subHeader: header,
      message: message,
      buttons: ['OK']
    });

    await alert.present();
  }

  async presentToast(message) {
    const toast = await this.toastCtrl.create({
      message: message,
      cssClass: "pop-up",
      duration: 3000
    });
    toast.present();
  }

  toggle_pushNotif() {

    if (!this.personalForm?.value) {
      return;
    }

    this.personalForm.value.push_noti_opt_out = !this.personalForm.value.push_noti_opt_out
  }

  public async onPrivacyClick(){
    await this._termsSvc.showPrivacyPolicy();
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


  public toggle_dontSellData() {

    if (!this.personalForm?.value) {
      return;
    }

    //If switching to on
    if(!this.personalForm.value.optOutDataSale){
      const aYearAgo = getUnixTime(addYears(new Date(), -1));
      
      if(!this._privacyPrefs?.confirmed_optOutDataSale_on || this._privacyPrefs.confirmed_optOutDataSale_on < aYearAgo) {

        this.confirm_privacy_option("Opt Out of Data Sale", ()=>{ this.personalForm.value.optOutDataSale = true; })
        .then(x=>{
          this._privacyPrefs = this._privacyPrefs || {};
          this._privacyPrefs.confirmed_optOutDataSale_on = getUnixTime(new Date());
          this._prefSvc.updatePreferenceValue(PreferenceType.Privacy, this._privacyPrefs, false);
        })
        return;
      }
    }

    this.personalForm.value.optOutDataSale = !this.personalForm.value.optOutDataSale
  }

  public toggle_limitDataUse() {

    if (!this.personalForm?.value) {
      return;
    }

     //If switching to on
     if(!this.personalForm.value.limitDataUse){
      const aYearAgo = getUnixTime(addYears(new Date(), -1));
      
      if(!this._privacyPrefs?.confirmed_limitDataUse_on || this._privacyPrefs.confirmed_limitDataUse_on < aYearAgo) {

        this.confirm_privacy_option("Limit Sensitive Data Use", ()=>{ this.personalForm.value.limitDataUse = true; })
        .then(x=>{
          this._privacyPrefs = this._privacyPrefs || {};
          this._privacyPrefs.confirmed_limitDataUse_on = getUnixTime(new Date());
          this._prefSvc.updatePreferenceValue(PreferenceType.Privacy, this._privacyPrefs, false);
        })
        return;
      }
    }

    this.personalForm.value.limitDataUse = !this.personalForm.value.limitDataUse
  }

  public toggle_enrollBeta() {

    if (!this.personalForm?.value) {
      return;
    }

    this.personalForm.value.is_beta = !this.personalForm.value.is_beta
  }


  public referralCode: string = "";
  public referralCodeReset() {
    setTimeout(() => {
      this.referralCode = "";  
    }, 0);
  }

}
