import { Injectable } from '@angular/core';
import { ILogService } from '../logging/log.service';
import { AlertController, AlertOptions, LoadingController, ModalController, ModalOptions } from '@ionic/angular';
import { UserTrackingService } from '../user-tracking/user-tracking.service';
import { Logger } from '../logging/logger';
import { OverlayEventDetail } from '@ionic/core';

export abstract class IModalService {

  public abstract open(modalName: string, opts: ModalOptions, eventData?: any): Promise<HTMLIonModalElement>;
  public abstract dismiss(data?: any, role?: string, id?: string): Promise<boolean>;
  public abstract open_alert(alertId, opts: AlertOptions): Promise<HTMLIonAlertElement>;
  public abstract is_modal_showing(id: string): boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ModalService implements IModalService {

  private readonly _logger: Logger;
  private readonly _modalHandles: { [key: string]: HTMLIonModalElement[] } = {};

  constructor(
    logSvc: ILogService,
    private readonly _userTrackingSvc: UserTrackingService,
    private readonly _modalCtrl: ModalController,
    private readonly _alertCtrl: AlertController,
    private readonly _loadingCtrl: LoadingController
  ) {
    this._logger = logSvc.getLogger("ModalService");
  }

  public is_modal_showing(id: string) {
    return this._modalHandles[id] && this._modalHandles[id].length > 0;
  }

  public async open(
    modalName: string,
    opts: ModalOptions,
    eventData?: any): Promise<HTMLIonModalElement> {

    opts.id = opts.id || modalName;
    opts.componentProps = opts.componentProps || {};
    opts.componentProps.isModal = true;
    opts.componentProps.modalId = opts.id;

    this._logger.LogDebug("open", modalName, opts, eventData);

    //If we already have a modal handle (can happen on concurrent calls)
    if (this._modalHandles[opts.id] && this._modalHandles[opts.id].length > 0) {
      this._logger.LogDebug("open", opts.id, "May already be a modal open with id, closing...");
      try {
        await this.dismiss(null, null, opts.id);
      } catch (ex) {
        //gulp
      }
    }

    //create the new modal
    this._modalHandles[opts.id] = this._modalHandles[opts.id] || [];
    const modal = await this._modalCtrl.create(opts);
    this._modalHandles[opts.id].push(modal);

    await Promise.all([
      modal.present(),
      this._userTrackingSvc.setScreenName(modalName, eventData)
    ]);

    return modal;
  }

  public async dismiss(data?: any, role?: string, id?: string): Promise<boolean> {

    this._logger.LogDebug("dismiss", id, data, role);

    let key = id;
    if (key == null) {
      const modal = await this._modalCtrl.getTop();
      key = modal?.id;
    }

    if (key == null || !this._modalHandles[key] || this._modalHandles[key].length == 0) {
      this._logger.LogDebug("dismiss", "Cannot find any modals, return false");
      return false;
    }

    this._logger.LogDebug("dismiss", id, "match", key);

    const modals = this._modalHandles[key];
    this._modalHandles[key] = [];

    modals.filter(x => x != null)
      .forEach(async modal => {
        this._logger.LogDebug("closing", modal, data, role);
        try {
          // this allows us to dismiss any popup where the caller
          // prevented dismissal
          modal.canDismiss = true;
          await modal.dismiss(data, role);
        } catch (ex) {
          this._logger.LogWarning("dismiss", "Modal Dismiss Error", modal.id, ex);
        }
      });

    return true;
  }


  public async open_alert(alertId, opts: AlertOptions, dismissFx: <T = any>() => Promise<OverlayEventDetail<T>> = null): Promise<HTMLIonAlertElement> {

    try {
      const loader = await this._loadingCtrl.getTop()
      if (loader) {
        await loader.dismiss();
      }
    } catch (ex) {
      this._logger.LogDebug("open_alert", "loadingController", "dismiss", ex);
    } finally {

      opts.id = opts.id || alertId;
      opts.cssClass = opts.cssClass || "pop-up";

      const alert = await this._alertCtrl.create(opts);

      await alert.present();

      return alert;
    }
  }
}
