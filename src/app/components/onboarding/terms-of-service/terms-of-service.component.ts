import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController } from '@ionic/angular';
import { Terms } from 'src/app/models/Terms';
import { User } from "src/app/models/User";
import { ApiService } from 'src/app/services/api.service';
import { IBrowserNavigationService } from 'src/app/services/browser-navigation/browser-navigation.service';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import { TermsService } from 'src/app/services/terms.service';
import { UserService } from 'src/app/services/user.service';

@Component({
  selector: 'terms-of-service',
  templateUrl: './terms-of-service.component.html',
  styleUrls: [
    '../onboarding.scss',
    './terms-of-service.component.scss'
  ],
})
export class TermsOfServiceComponent implements OnInit {

  private readonly _logger: Logger;
  private _currentUser: User;

  public terms: Terms;


  constructor(
    logSvc: ILogService,
    private readonly _termsSvc: TermsService,
    private readonly _apiSvc: ApiService,
    private readonly _navSvc: IBrowserNavigationService,
    private readonly _loadingCtrl: LoadingController,
    private readonly _userSvc: UserService
  ) {
    this._logger = logSvc.getLogger("TermsOfServiceComponent");

    this._userSvc.currentUser$.subscribe(u=>{
      this._currentUser = u;
    })
  }

  ngOnInit() { }

  ionViewWillEnter(){
    this._termsSvc.getCurrentTerms()
      .then(t=>this.terms = t.current_terms);
  }

  public async onSubmit() {

    const spinnerCtrl = await this._loadingCtrl.create({
      message: "One moment please...",
    });

    await spinnerCtrl.present();
    await this._termsSvc.acceptTerms(this.terms.id)
    await this._navSvc.requestNavigation(false, false, true);
    await spinnerCtrl.dismiss();
  }

  public async onLogout() {
    await this._apiSvc.removeAuthToken();
  }
}
