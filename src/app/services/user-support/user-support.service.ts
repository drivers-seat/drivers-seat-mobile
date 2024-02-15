import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Browser } from '@capacitor/browser';
import { Logger } from '../logging/logger';
import { ILogService } from '../logging/log.service';
import { ApiService } from '../api.service';
import { KnowledgeBaseArticle } from 'src/app/models/KnowledgeBaseArticle';
import { UserTrackingService } from '../user-tracking/user-tracking.service';
import { IModalService } from '../modal/modal.service';
import { HelpRequestComponent } from 'src/app/components/help/help-request/help-request.component';
import { HttpClient } from '@angular/common/http';
import { UserService } from '../user.service';
import { HelpRequest } from 'src/app/models/HelpRequest';
import { AppUpdatedRequiredInfo } from 'src/app/models/AppUpdatedRequiredInfo';
import { UpdateRequiredComponent } from 'src/app/components/help/update-required/update-required.component';
import { IExternalContentService } from '../external-content/external-content.service';
import { MaintenanceModeInfo } from 'src/app/models/MaintenanceModeInfo';
import { MaintenanceModeComponent } from 'src/app/components/help/maintenance-mode/maintenance-mode.component';
import { SessionService } from '../session.service';

export abstract class IUserSupportService {
  public abstract openMessenger(): Promise<void>;
  public abstract composeMessage(subject: string, initialText: string): Promise<void>;
  public abstract submitHelpRequest(model: HelpRequest): Promise<void>;
  public abstract openKnowledgeBaseArticle(article: KnowledgeBaseArticle): Promise<void>;
  public abstract showUpdateRequiredPopup(info: AppUpdatedRequiredInfo): Promise<void>;
  public abstract showMaintenanceModePopup(info: MaintenanceModeInfo):Promise<void>;
  public abstract hideMaintenanceModePopup():Promise<void>;
}

@Injectable({
  providedIn: 'root'
})
export class UserSupportService implements IUserSupportService {

  private readonly _logger: Logger;

  constructor(
    loggerFactory: ILogService,
    private readonly _apiSvc: ApiService,
    private readonly _httpSvc: HttpClient,
    private readonly _userSvc: UserService,
    private readonly _userTrackingSvc: UserTrackingService,
    private readonly _modalSvc: IModalService,
    private readonly _externalContentSvc: IExternalContentService,
    private readonly _sessionSvc: SessionService
  ) {

    this._logger = loggerFactory.getLogger("UserSupportService");
  }

  public async composeMessage(subject: string, initialText: string): Promise<void> {

    if (this._apiSvc.isGhosting) {
      this._logger.LogInfo("composeMessage", "Ignoring during ghosting session", initialText);
      return;
    }

    const model = new HelpRequest();
    const user = this._userSvc.currentUser$.value;

    model.subject = subject?.trim();
    model.message = initialText?.trim();

    if (user) {
      model.name = (`${user?.first_name || ""} ${user?.last_name || ""}`).trim();
      model.email = user?.email.trim();
    }

    await this._modalSvc.open("helpRequest", {
      component: HelpRequestComponent,
      componentProps: {
        model: model
      }
    });
  }

  public async openMessenger(): Promise<void> {

    if (this._apiSvc.isGhosting) {
      this._logger.LogInfo("openMessenger", "Ignoring during ghosting session");
      return;
    }

    try {
      await this.composeMessage(null, null)
    } catch (ex) {
      this._logger.LogError(ex, "openMessenger", "Failed during this.composeMessage()");
    }
  }

  public async openKnowledgeBaseArticle(article: KnowledgeBaseArticle) {

    this._logger.LogDebug("openKnowledgeBaseArticle", article);

    const url = `${this._apiSvc.endpoint_url()}/web/help/${article}`;

    await Promise.all([ 
      Browser.open({
        url: url,
        windowName: "Knowledge Base",
        presentationStyle: 'fullscreen',
        toolbarColor: "d7d9f9",
      }),
      this._userTrackingSvc.setScreenName(`help/${article}`)
    ]);
  }

  public async submitHelpRequest(model: HelpRequest): Promise<void> {

    if (!model) {
      this._logger.LogWarning("submitHelpRequest", "model was null");
      return;
    }

    const url = this._userSvc.currentUser$.value != null
      ? `${this._apiSvc.url()}/help/request/authenticated`
      : `${this._apiSvc.url()}/help/request/public`;

    await this._httpSvc.post(url, model).toPromise();
  }


  public async showUpdateRequiredPopup(info: AppUpdatedRequiredInfo){
    if (this._modalSvc.is_modal_showing("UpdateRequired")){
      return;
    }

    await this._modalSvc.open("UpdateRequired", {
      component: UpdateRequiredComponent,
      componentProps: {
        title: this._externalContentSvc.santizeHtml(info?.title || "A New Version is Available"),
        message: this._externalContentSvc.santizeHtml(info?.message || ""),
        info: info
      },
      canDismiss: false,
      backdropDismiss: false,
      swipeToClose: false,
      keyboardClose: false
    });
  }

  public async showMaintenanceModePopup(info: MaintenanceModeInfo){
    if (this._modalSvc.is_modal_showing("maintenanceMode")){
      return;
    }

    await this._modalSvc.open("maintenanceMode", {
      component: MaintenanceModeComponent,
      componentProps: {
        title: this._externalContentSvc.santizeHtml(info?.title || "Application Not Available"),
        message: this._externalContentSvc.santizeHtml(info?.message || ""),
        info: info
      },
      canDismiss: false,
      backdropDismiss: false,
      swipeToClose: false,
      keyboardClose: false
    });
  }

  public async hideMaintenanceModePopup(): Promise<void> {

    if (!this._modalSvc.is_modal_showing("maintenanceMode")){
      return;
    }

    await this._modalSvc.dismiss(null,null,"maintenanceMode");
  }

}