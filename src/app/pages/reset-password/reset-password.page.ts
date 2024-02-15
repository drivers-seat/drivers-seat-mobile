import { Component } from '@angular/core';
import { AlertController, LoadingController } from '@ionic/angular';
import { SessionService } from '../../services/session.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.page.html',
  styleUrls: ['./reset-password.page.scss'],
})
export class ResetPasswordPage {
  public email: string;
  public contentInvisible: boolean = false;
  public showError: boolean;
  public showBackendError: boolean;
  private readonly  _logger: Logger;

  constructor(
    logSvc: ILogService,
    public sessionService: SessionService,
    public alertCtrl: AlertController,
    public loadingCtrl: LoadingController,
    public router: Router,
    private _activatedRoute: ActivatedRoute) {

    this._logger = logSvc.getLogger("ResetPasswordPage");
    this.showError = false;
    this.showBackendError = false;
  }

  ngOnInit() {

    this._activatedRoute?.queryParams
      .subscribe(params => {
        this.setEmailAddress(params?.email);
      });
  }

  setEmailAddress(email: string) {
    this.email = email || "";
  }

  submit() {
    if (this.mailInvalid) {
      this.showError = true;
    }
    else {

      this.sessionService.forgotPassword(this.email)
        .then(data => {
          this.presentAlert('Email sent!', "Please check your email for further instructions.");
          this.router.navigateByUrl(`login?email=${this.email}`);
        })
        .catch(err => {
          let message = "";
          if (err.error) {
            for (var key in err.error.errors) {
              let error = err.error.errors[key];
              message += key + ' ' + error + '\n';
            }
          } else {
            message = err;
          }
        });
    }
  }

  get emailErrorVisible() {
    return this.showError && ((!this.email) || (this.email.indexOf('@') < 0))
  }

  get mailInvalid(): boolean {
    return ((!this.email) || (this.email.indexOf('@') < 0));
  }

  mailChanged() {
    if (this.email != undefined && this.email.length == 0 && this.showBackendError) {
      this.showBackendError = false;
    }
  }

  public getInputClass(errorVisible: boolean): string {
    let ret: string = "";
    if (errorVisible) {
      ret = "errorClass";
    }

    return ret;
  }

  backToLogin() {
    this.router.navigateByUrl('login');
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
}
