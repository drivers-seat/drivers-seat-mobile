import { Component } from '@angular/core';
import { AlertController, LoadingController, MenuController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../../services/user.service';
import { ApiService } from '../../services/api.service';
import { SessionService } from '../../services/session.service';
import { TermsService } from '../../services/terms.service';
import { UserTrackingService } from 'src/app/services/user-tracking/user-tracking.service';
import { TrackedEvent } from 'src/app/models/TrackedEvent';
import { HttpUrlEncodingCodec } from '@angular/common/http';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: [
    './login.page.scss'],
})
export class LoginPage {
  
  private _queryParams:any;

  public email: string;
  public password: string;
  public canLogin: boolean;
  public showPassword: boolean;
  

  

  constructor(
    public userService: UserService,
    public sessionService: SessionService,
    public apiService: ApiService,
    public termsService: TermsService,
    public router: Router,
    public menuController: MenuController,
    private readonly _alertCtrl: AlertController,
    private readonly _loadingCtrl: LoadingController,
    private readonly _userTrackingSvc : UserTrackingService,
    private readonly _activatedRoute: ActivatedRoute,
    private readonly _httpCodec: HttpUrlEncodingCodec
  ) {
    this.showPassword = false;
  }

  ngOnInit() {
    this._activatedRoute.queryParams
    .subscribe(params => {
      this._queryParams = params;
    });
  }

  ionViewWillEnter() {
    if(this._queryParams?.email && this._queryParams?.email != "" && this._queryParams?.email != "null"){

      this.email = this._queryParams?.email
    }
    this.password = "";
    this.showPassword = false;
    this.canLogin = false;
  }


  toggleShowPasswordClearText() {
    this.showPassword = !this.showPassword;
  }

  navigateToRegister() {
    if(this.email){
      this.router.navigateByUrl(`onboarding?email=${this.email}`);
    } else {
      this.router.navigateByUrl('onboarding');
    }
  }

  public inputChanged() {
    this.canLogin = this.validate_EmailAndPassword()
  }

  private async getLoadingSpinner(): Promise<HTMLIonLoadingElement> {
    return await this._loadingCtrl.create({
      message: 'One moment please...'
    });
  }

  private validate_EmailAndPassword(): boolean {

    let result = true;

    if (!this.email || this.email.trim() == "") {
      result = false;
    } else if(!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(this.email)){
      result = false;
    }

    if (!this.password || this.password.length < 8) {
      result = false;
    }

    return result;
  }

  private onLoginFailed() {
    this._alertCtrl.create({
      header: `Login Failed`,
      message: `We didn't find an account with email ${this.email} or the password was incorrect.`,
      cssClass: "pop-up",   //in global.scss
      buttons: [
        {
          text: "Reset my password",
          handler: (v) => {
            this.forgotPassword();
          }
        },
        {
          text: "I'm a new user",
          handler: (v) => {
            this.navigateToRegister();
          }
        },
        {
          text: "Try again",
          role: "cancel"
        }
      ]
    }).then(a => a.present());
  }

  public async login() {

    const spinner = await this.getLoadingSpinner();
    await spinner.present();

    await this.sessionService.createSession(this.email, this.password)
      .then(async (user) => {
        this.password = "";

        this._userTrackingSvc.captureEvent(TrackedEvent.login);
      })
      .finally(async () => {
        await spinner.dismiss();
      })
      .catch(async (err) => {

        /**
         * Any network responses with error codes (except for 401 and 451)
         * will forward to Sentry via src/app/services/interceptor.ts
         *
         * Users cannot experience 451 errors on authentication, so we only
         * need to handle the 401 case.
         */
        if (err.status === 401) {
          this.onLoginFailed();
        }
      });
  }

  public async forgotPassword() {
    if(this.email){
      await this.router.navigateByUrl(`reset-password?email=${this._httpCodec.encodeValue(this.email)}`);
    } else {
      await this.router.navigateByUrl('reset-password');
    }
  }

}
