import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { LoadingController } from '@ionic/angular';
import { TextHelper } from 'src/app/helpers/TextHelper';
import { IBrowserNavigationService } from 'src/app/services/browser-navigation/browser-navigation.service';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import { TermsService } from 'src/app/services/terms.service';
import { UserService } from 'src/app/services/user.service';


@Component({
  selector: 'create-account',
  templateUrl: './create-account.component.html',
  styleUrls: [
    '../onboarding.scss',
    './create-account.component.scss'
  ],
})
export class CreateAccountComponent implements OnInit {

  public email: string;
  public password: string;

  public canSubmit: boolean;

  public unknownError: boolean = false;

  public emailIsValid: boolean;
  public emailIsAvailable?: boolean;
  public emailIsFocused: boolean;
  public emailHasFocused: boolean;
  public emailErrorText: string;

  public passwordIsValid: boolean;
  public passwordIsFocused: boolean;
  public passwordHasFocused: boolean;
  public passwordShowText: boolean;
  public passwordErrorText: string;

  private readonly _emailCheckCache: { [key: string]: boolean } = {};
  private readonly _logger: Logger;

  private _queryParams:Params;


  constructor(
    logSvc: ILogService,
    private readonly _userSvc: UserService,
    private readonly _router: Router,
    private readonly _navSvc: IBrowserNavigationService,
    private readonly _loadingCtrl: LoadingController,
    private readonly _activatedRoute: ActivatedRoute,
    private readonly _termsSvc: TermsService
  ) {
    this._logger = logSvc.getLogger("CreateAccountComponent");
  }

  ngOnInit() {

    this._activatedRoute.queryParams
      .subscribe(params => {
        this._queryParams = params;
      });
  }

  ionViewWillEnter(){

    this.password = null;
    this.email = this._queryParams?.email || "";

    this.canSubmit = false;
  
    this.unknownError = false;
    this.emailIsValid = false;
    this.emailIsAvailable= null;
    this.emailIsFocused= false;
    this.emailHasFocused = false;
    this.emailErrorText = null;

    this.passwordIsValid = false;
    this.passwordIsFocused = false;
    this.passwordHasFocused = false;
    this.passwordShowText= false;
    this.passwordErrorText = null;

    this.onChange();
  }

  public emailChanged(email) {

    const emailChk = email?.trim()?.toLowerCase();


    this.emailIsValid = TextHelper.isEmailValid(emailChk);

    //If not a valid email address, no need to check
    if (!this.emailIsValid) {
      this.emailIsAvailable = null;
      this.onChange();
      return;
    }

    if (this._emailCheckCache[emailChk] != null) {
      this.emailIsAvailable = this._emailCheckCache[emailChk];
      this.onChange();
      return;
    }

    this._logger.LogDebug("emailChanged", `Checking if ${emailChk} is available`);

    this.emailIsAvailable = null;

    this._userSvc.checkEmailAddressAvailable(emailChk)
      .then(response => {

        if (response.isAvailable == null) {
          this._logger.LogWarning("emailChanged", "Did not receive a server response");
        } else {
          this._emailCheckCache[response.email] = response.isAvailable;
        }

        if (response.email == emailChk) {
          this.emailIsAvailable = response.isAvailable;
          this.onChange();
        }
      });
  }

  public emailFocusChange(isFocused: boolean) {

    if (isFocused) {
      this.emailHasFocused = true;
    }
    this.emailIsFocused = isFocused;
    this.emailChanged(this.email);
  }

  public passwordFocusChange(isFocused: boolean) {

    if (isFocused) {
      this.passwordHasFocused = true;
    }
    this.passwordIsFocused = isFocused;
    this.passwordChanged(this.password);
  }

  public passwordChanged(password) {
    this.passwordIsValid = TextHelper.isPasswordValid(password);
    this.onChange();
  }

  public togglePasswordVisibility() {
    this.passwordShowText = !this.passwordShowText;
  }

  public onChange() {

    this.emailErrorText = null;
    this.passwordErrorText = null;
    this.unknownError = false;

    if (this.emailIsAvailable == false) {
      this.emailErrorText = "email has already been taken";
    } else if (this.emailHasFocused && !this.emailIsFocused) {
      if (!this.emailIsValid) {
        this.emailErrorText = "please enter a valid email address";
      } else {
        this.emailErrorText = null;
      }
    }

    if (this.passwordHasFocused && !this.passwordIsFocused) {
      if (this.password?.trim() == "") {
        this.passwordErrorText = null;
      } else if (!this.passwordIsValid) {
        this.passwordErrorText = "passwords must have 8-characters"
      } else {
        this.passwordErrorText = null;
      }
    }

    this.canSubmit = this.emailIsAvailable == true && this.passwordIsValid;
  }

  public onUnknownApiError(){
    this.unknownError = true;
  }

  public onLoginClick() {
    if(this.email){
      this._router.navigateByUrl(`login?email=${this.email}`);
    } else {
      this._router.navigateByUrl('login');
    }
  }

  public async onShowTermsClick() {
    await this._termsSvc.showPublicTerms()
  }

  public async onShowPrivacyPolicyClick(){
    await this._termsSvc.showPrivacyPolicy();
  }

  public async onSubmit() {

    const spinnerCtrl = await this._loadingCtrl.create({
      message: "Creating your new account...",
    });

    spinnerCtrl.present();

    await this._userSvc.createUser(this.email, this.password, null)
      .then(async () => {
        await this._navSvc.navigateToTermsOfService();
      })
      .catch(async (err) => {
        switch (err.status) {
          case 422:
            this.emailIsAvailable = false;
            this.onChange();
            break;
          default:
            this.onUnknownApiError();
            break;
        }
      })
      .finally(async ()=>{
        await spinnerCtrl.dismiss();
      })
  }
}
