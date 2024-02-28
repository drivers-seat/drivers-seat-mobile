import { Component, OnInit } from '@angular/core';
import { SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { StatusBar } from '@capacitor/status-bar';
import { LoadingController } from '@ionic/angular';
import { CampaignAction, ContentCTACampaign } from 'src/app/models/Campaign';
import { IDeviceService } from 'src/app/services/device/device.service';
import { IExternalContentService } from 'src/app/services/external-content/external-content.service';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import { IMarketingService } from 'src/app/services/marketing/marketing.service';
import { IModalService } from 'src/app/services/modal/modal.service';

@Component({
  selector: 'marketing-cta',
  templateUrl: './call-to-action.component.html',
  styleUrls: [
    '../marketing.scss',
    './call-to-action.component.scss'
  ],
})
export class CallToActionComponent implements OnInit {

  private readonly _logger: Logger;

  public campaignId: string;

  private _pauseKey: string;

  private _additionalData: any;

  public campaign: ContentCTACampaign;
  public content_html: SafeHtml;
  hasExternalHtml: boolean;

  public get custom_actions(): CampaignAction[] {
    return this.campaign?.actions?.filter(a => !a.is_default && !a.is_header) || [];
  }

  public get default_actions(): CampaignAction[] {
    return this.campaign?.actions?.filter(a => a.is_default && !a.is_header) || [];
  }

  public get closeAction(): CampaignAction {
    return this.campaign
      ?.actions
      ?.filter(a=> a.is_header)
      ?.find(a=>a.type == 'dismiss' || a.type == 'close');
  }

  public get helpAction(): CampaignAction {
    return this.campaign
      ?.actions
      ?.filter(a=> a.is_header)
      ?.find(a=>a.type == 'help');
  }

  public get hasHeaderActions():boolean{
    return this.closeAction != null || this.helpAction != null;
  }

  public content_url: SafeResourceUrl;
  public video_url: string;

  public get showHeader(): boolean {
    return this.hasHeaderActions || this.campaign?.header?.length > 0
  }

  public get showFooter(): boolean {
    return this.custom_actions?.length > 0 ||
      this.campaign?.footer?.length > 0 ||
      this.showFooterLinks;
  }

  public get showFooterLinks(): boolean {
    return this.default_actions?.length > 0;
  }

  public get mainHeader(): string {
    return (this.campaign?.header?.length > 0)
      ? this.campaign.header[0]
      : null;
  }

  public get subHeaders(): string[] {
    return this.campaign?.header?.slice(1);
  }

  constructor(
    logSvc: ILogService,
    private readonly _marketingSvc: IMarketingService,
    private readonly _routeSvc: ActivatedRoute,
    private readonly _externalContentSvc: IExternalContentService,
    private readonly _loadingCtrl: LoadingController,
    private readonly _deviceSvc: IDeviceService,
    private readonly _modalSvc: IModalService
  ) {
    this._logger = logSvc.getLogger("CallToActionComponent");

    this._routeSvc.paramMap
      .subscribe(params => {
        this.campaignId = params.get("id");
        this._logger.LogDebug("CampaignId", this.campaignId);
      });
  }

  public async ionViewWillEnter() {

    if (!this._deviceSvc.is_Web) {
      await StatusBar.hide();
    }

    if (!this.campaignId) {
      this._logger.LogWarning("ionViewDidEnter", "CampaignID is null");
      await this._modalSvc.dismiss(null, null, this.campaignId);
      return;
    }

    this.campaign = await this._marketingSvc.getCampaign<ContentCTACampaign>(this.campaignId);

    if (!this.campaign) {
      this._logger.LogWarning("ionViewDidEnter", "cant find campaign", this.campaignId);
      await this._modalSvc.dismiss(null, null, this.campaignId);
      return;
    }

    this._logger.LogDebug("ionViewWillEnter", this.campaign);

    //Prevent future campaigns from popping up while looking at this one.
    this._marketingSvc.pause(this.campaign.id);

    this.video_url = null;
    this.content_url = null;
    this.content_html = null;
    this.hasExternalHtml = false;

    if (this._externalContentSvc.isUrlVideoContent(this.campaign?.content_url)) {
      this.video_url = this.campaign.content_url;
    } else if (this._externalContentSvc.isUrlExternal(this.campaign?.content_url)) {
      this.content_url = this._externalContentSvc.getSafeUrl(this.campaign.content_url);
    } else if (this.campaign?.content_url){
      this.hasExternalHtml = true;
      this.content_html = await this._externalContentSvc.getExternalHtml(this.campaign.content_url);
    }

    await this._marketingSvc.presentCampaign(this.campaign.id);
  }

  public async ionViewWillLeave() {
    this._logger.LogDebug("ionViewWillLeave");
    if (!this._deviceSvc.is_Web) {
      await StatusBar.show();
    }
  }

  public async ionViewDidEnter() {
  }

  public async handleButton(action: CampaignAction) {
    const spinnerCtrl = await this._loadingCtrl.create({
      message: "one moment please..."
    });

    await spinnerCtrl.present();

    try {
      await this._marketingSvc.handleCampaignAction(this.campaign.id, action, this._additionalData);
    }
    finally {
      await spinnerCtrl.dismiss();
    }
  }

  public async onVideoStart() {

    this._additionalData = this._additionalData || {};
    this._additionalData.video_play_count = (this._additionalData.video_play_count || 0) + 1;
    this._logger.LogDebug("onVideoStart", "total count", this._additionalData.video_play_count);
  }

  public async onVideoReplay() {
  }

  public async onVideoEnd(duration) {
    this._additionalData = this._additionalData || {};
    this._additionalData.video_play_duration_seconds = (this._additionalData.video_play_duration_seconds || 0) + (duration || 0);
    this._logger.LogDebug("onVideoEnd", duration, "total duration", this._additionalData.video_play_duration_seconds);
  }


  ngOnInit() { }
}