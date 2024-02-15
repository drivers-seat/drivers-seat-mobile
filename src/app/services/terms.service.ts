import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { UserService } from './user.service';
import { AcceptedTerms, ITerms, Terms } from '../models/Terms';
import { TrackedEvent } from '../models/TrackedEvent';
import { UserTrackingService } from './user-tracking/user-tracking.service';
import { ILogService } from './logging/log.service';
import { Logger } from './logging/logger';
import { HttpClient } from '@angular/common/http';
import { User } from '../models/User';
import { IModalService } from './modal/modal.service';
import { PublicTermsOfServiceComponent } from '../components/help/public-terms-of-service/public-terms-of-service.component';
import { IExternalContentService } from './external-content/external-content.service';
import { getUnixTime } from 'date-fns';
import { LoadingController } from '@ionic/angular';
import { Browser } from '@capacitor/browser';

@Injectable({
  providedIn: 'root'
})
export class TermsService {

  private readonly _logger: Logger;
  private _publicTerms: Terms;
  private _publicTermsUpdated_at: number;

  constructor(
    logSvc: ILogService,
    private readonly _httpSvc: HttpClient,
    private readonly _apiSvc: ApiService,
    private readonly _userSvc: UserService,
    private readonly _userTrackingSvc: UserTrackingService,
    private readonly _modalSvc: IModalService,
    private readonly _externalContentSvc: IExternalContentService,
    private readonly _loadingCtrl: LoadingController

  ) {

    this._logger = logSvc.getLogger("TermsService");
  }

  public async getCurrentTerms(): Promise<ITerms> {
    return this._httpSvc.get(`${this._apiSvc.url()}/terms/current`)
      .toPromise().then(data => {
        let terms: ITerms = {
          current_terms: null,
          current_accepted_terms: null,
          future_terms: null,
          future_accepted_terms: null
        };
        if (data["data"]["current_terms"]) {
          terms.current_terms = Terms.parseTerms(data["data"]["current_terms"]);
        }
        if (data["data"]["current_accepted_terms"]) {
          terms.current_accepted_terms = AcceptedTerms.parseTerms(data["data"]["current_accepted_terms"]);
        }
        if (data["data"]["future_terms"]) {
          terms.future_terms = Terms.parseTerms(data["data"]["future_terms"]);
        }
        if (data["data"]["future_accepted_terms"]) {
          terms.future_accepted_terms = AcceptedTerms.parseTerms(data["data"]["future_accepted_terms"]);
        }
        return terms;
      });
  }

  public async isCurrentTermsAccepted(): Promise<boolean> {
    return this.getCurrentTerms()
      .then(terms => {
        return (terms.current_accepted_terms &&
          terms.current_accepted_terms.terms_id === terms.current_terms.id)
      })
  }

  public async getTermsById(termsID): Promise<Terms> {
    return this._httpSvc.get(`${this._apiSvc.url()}/terms/${termsID}`)
      .toPromise().then(data => {
        return Terms.parseTerms(data["data"]);
      });
  }

  public async acceptTerms(termsID) {

    const data = await this._httpSvc.post(`${this._apiSvc.url()}/accepted_terms`,
      {
        "accepted_terms": {
          "terms_id": termsID
        }
      },
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } })
      .toPromise()

    //TODO:  this should be different and come from the API
    //It is requried so that services like the StatsService and CampaignService can
    //update their data with a valid user
    const currentUser = this._userSvc.currentUser;
    const newUser = new User();
    Object.keys(currentUser).forEach(k => newUser[k] = currentUser[k]);
    newUser.agreed_to_current_terms = true;
    this._userSvc.setUser(newUser);

    const acceptedTerms = AcceptedTerms.parseTerms(data["data"]);
    await this._userTrackingSvc.captureEvent(TrackedEvent.accept_terms_of_service, acceptedTerms);
  }

  public async getPublicTerms(): Promise<Terms> {

    var current_time = getUnixTime(new Date())
    if (this._publicTermsUpdated_at == null || (current_time - this._publicTermsUpdated_at) > 3600) {
      this._publicTerms = null;

      const data = await this._httpSvc.get(`${this._apiSvc.url()}/terms/public`).toPromise()
      this._publicTerms = Terms.parseTerms(data["data"]);
      this._publicTermsUpdated_at = getUnixTime(new Date());
    }

    return this._publicTerms;
  }

  public async showPublicTerms(): Promise<void> {

    const spinner = await this._loadingCtrl.create({
      message: "getting latest terms of service..."
    });

    await spinner.present();

    try {
      const terms = await this.getPublicTerms();

      await this._modalSvc.open("publicTerms", {
        component: PublicTermsOfServiceComponent,
        componentProps: {
          title: this._externalContentSvc.santizeHtml(terms.title),
          detail: this._externalContentSvc.santizeHtml(terms.text)
        }
      });
    } catch (ex) {

      this._logger.LogError(ex, "showPublicTerms")

    } finally {
      await spinner?.dismiss()
    }
  }

  public async showPrivacyPolicy(): Promise<void> {
    await Browser.open({
      url: `${this._apiSvc.endpoint_url()}/help/Privacy_Policy/index.html`,
      windowName: "Privacy Policy",
      presentationStyle: 'fullscreen',
      toolbarColor: "d7d9f9",
    });
  }

}
