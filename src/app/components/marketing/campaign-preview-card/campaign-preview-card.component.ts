import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { SafeHtml, SafeResourceUrl, SafeUrl } from '@angular/platform-browser';
import { LoadingController } from '@ionic/angular';
import { Campaign, CampaignAction, CampaignPreview } from 'src/app/models/Campaign';
import { ChartOptions } from 'src/app/models/Survey';
import { ApiService } from 'src/app/services/api.service';
import { IExternalContentService } from 'src/app/services/external-content/external-content.service';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import { IMarketingService } from 'src/app/services/marketing/marketing.service';

@Component({
  selector: 'campaign-preview-card',
  templateUrl: './campaign-preview-card.component.html',
  styleUrls: [
    '../marketing.scss',
    '../campaign-card/campaign-card.component.scss',
    './campaign-preview-card.component.scss'
  ]
})
export class CampaignPreviewCardComponent implements OnInit {

  private readonly _logger: Logger
  
  private _campaign: Campaign;
  private _custom_class: string[];

  public preview: CampaignPreview;
  
  public hasHeader: boolean;
  public hasFooter: boolean;
  public hasDescription: boolean;
  public hasContentUrl: boolean;
  public hasInternalContentUrl: boolean;
  public isVideoContentUrl: boolean;
  
  public hasContent: boolean;
  public contentUrl: SafeResourceUrl;
  public innerContent: SafeHtml;
  public htmlContent: SafeHtml;
  
  
  public imageUrls: SafeResourceUrl[];
  public topChart: ChartOptions;
  public bottomChart: ChartOptions;
  public hasLeftImage: boolean;
  public hasRightImage: boolean;
  
  public rightImageUrl: SafeResourceUrl;
  
  public display_class:string[];

  @Input()
  public get campaign(): Campaign{
    return this._campaign;
  }

  public set campaign(campaign:Campaign){
    this._campaign = campaign;
    this.updateCampaign();
  }


  @Input()
  public get custom_class(): string[] {
    return this._custom_class;
  }

  public set custom_class(custom_class:string[]){
    this._custom_class = custom_class
    this.updateCampaign();
  }


  @Output()
  public onAction: EventEmitter<CampaignAction> = new EventEmitter();


  constructor(
    logSvc: ILogService,
    private readonly _marketingSvc: IMarketingService,
    private readonly _loadingCtrl: LoadingController,
    private readonly _externalContentSvc: IExternalContentService
  ) { 
    this._logger = logSvc.getLogger("CampaignPreviewCardComponent");
  }

  ngOnInit() {}

  private async updateCampaign(){

    this.preview = this._campaign?.preview;

    this.hasHeader = false;
    this.hasFooter = false;
    
    this.hasContent=false;
    this.hasDescription = false;
    this.hasContentUrl = false;
    this.hasInternalContentUrl = false;
    this.isVideoContentUrl = false;
    this.contentUrl = null;

    this.imageUrls = [];
    this.topChart = null;
    this.bottomChart = null;
    this.rightImageUrl = null;
    this.hasLeftImage = false;
    this.hasRightImage = false;

    this.display_class = [];

    if(!this.preview){
      return;
    }

    this.display_class.push(
      this._campaign.type, 
      this._campaign.status, 
      this._campaign.id, 
      ...this._campaign.categories || [],
      ...this.preview.display_class || [],
      ...this.custom_class || []
    );

    this.hasHeader = this.preview?.title.length > 0;
    this.hasFooter = this.preview?.actions?.filter(a=>!a.is_header)?.length > 0;

    this.hasLeftImage = this.preview?.image_url_left != null;
    if(this.hasLeftImage){
      this.imageUrls.push(this._externalContentSvc.getSafeUrl(this.preview.image_url_left, false));
    }

    this.hasRightImage = this.preview?.image_url_right != null;
    if(this.hasRightImage){
      this.rightImageUrl = this._externalContentSvc.getSafeUrl(this.preview.image_url_right, false);
      this.imageUrls.push(this.rightImageUrl);
      
    }

    this.topChart = this.preview?.chart_top;
    this.bottomChart = this.preview?.chart_bottom;

    this.hasDescription = this.preview?.description?.length > 0;
    
    this.hasContentUrl = this.preview?.content_url != null;
    if (this.hasContentUrl){
      this.hasInternalContentUrl = !this._externalContentSvc.isUrlExternal(this.preview.content_url);
      this.isVideoContentUrl = this._externalContentSvc.isUrlVideoContent(this.preview.content_url);
      this.contentUrl = this._externalContentSvc.getSafeUrl(this.preview.content_url);

      if(this.hasInternalContentUrl){
        this.htmlContent = await this._externalContentSvc.getExternalHtml(this.preview.content_url)
      }
    } else {
      this.htmlContent = null;
    }

    this.hasContent = this.hasDescription || this.hasContentUrl

  }

  public async onActionClick(action: CampaignAction){
    this._logger.LogDebug("onActionClick", action);

    if(!action || !this.campaign){
      return;
    }

    const spinnerCtrl = await this._loadingCtrl.create({
      message: "one moment please..."
    });

    try {
      await spinnerCtrl.present();
      await this._marketingSvc.handleCampaignAction(this.campaign?.id, action, this.campaign?.state, true);
    }
    catch(ex){
      this._logger.LogWarning("onActionClick", ex, action)
    }
    finally {
      await spinnerCtrl.dismiss();
    }
  }
}
