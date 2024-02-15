import { Component, OnInit } from '@angular/core';
import { LoadingController, ToastController } from '@ionic/angular';
import { HelpRequest } from 'src/app/models/HelpRequest';
import { KnowledgeBaseArticle } from 'src/app/models/KnowledgeBaseArticle';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import { IModalService } from 'src/app/services/modal/modal.service';
import { IUserSupportService } from 'src/app/services/user-support/user-support.service';
import { UserService } from 'src/app/services/user.service';

@Component({
  selector: 'app-help-request',
  templateUrl: './help-request.component.html',
  styleUrls: [
    '../help.scss',
    './help-request.component.scss'
  ]
})
export class HelpRequestComponent implements OnInit {

  private readonly _logger : Logger;

  public model: HelpRequest;
  public isValid: boolean;

  constructor(
    logSvc: ILogService,
    private readonly _loadingCtrl: LoadingController,
    private readonly _modalSvc: IModalService,
    private readonly _supportSvc: IUserSupportService,
    private readonly _userSvc: UserService,
    private readonly _toastCtrl: ToastController
  ) {
    this._logger = logSvc.getLogger("HelpRequestComponent");
  }

  ngOnInit() {
    this.isValid = this.validate()
  }

  public async onChange() {
    this.isValid = this.validate();
  }

  public get showContactInfo(): boolean {
    return !(this._userSvc?.currentUser$.value != null);
  }

  private validate():boolean{
    
    if((this.model?.name?.trim() || "") == ""){
      return false;
    }

    if((this.model?.email?.trim() || "") == ""){
      return false;
    }

    if((this.model?.subject?.trim() || "") == ""){
      return false;
    }

    if((this.model?.message?.trim() || "") == ""){
      return false;
    }

    return true;
  }

  public async onSubmit() {
    
    this.isValid = this.validate();
    
    if(!this.isValid){
      return;
    }

    const spinnerCtrl = await this._loadingCtrl.create({
      message: "one moment please..."
    })

    try {
      await spinnerCtrl.present();
      await this._supportSvc.submitHelpRequest(this.model);
      await this.onCancel();

      const toast = await this._toastCtrl.create({
        message: `Your Help Request has been submitted.  Keep an eye out for responses sent to ${this.model.email}.`,
        position: 'bottom',
        duration: 5000,
        cssClass: "pop-up"
      });

      await toast.present();
    }
    catch(ex){
      this._logger.LogWarning("onSubmit", ex, this.model);
    }
    finally {
      await spinnerCtrl.dismiss();
    }
  }

  public async onCancel() {
    await this._modalSvc.dismiss();
  }

  public async showHelpClick() {
    await this._supportSvc.openKnowledgeBaseArticle(KnowledgeBaseArticle.HelpIndex);
  }

}
