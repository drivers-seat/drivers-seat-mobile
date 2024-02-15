import { Component, OnInit } from '@angular/core';
import { Campaign } from 'src/app/models/Campaign';
import { StatusBar, Style } from '@capacitor/status-bar';
import { ApiService } from 'src/app/services/api.service';
import { IDeviceService } from 'src/app/services/device/device.service';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import { IMarketingService } from 'src/app/services/marketing/marketing.service';
import { IModalService } from 'src/app/services/modal/modal.service';
import { CampaignListComponent } from '../../marketing/campaign-list/campaign-list.component';
import { IPreferenceService } from 'src/app/services/preferences/preferences.service';
import { PreferenceType } from 'src/app/models/PreferenceType';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: [
    '../dashboard.scss',
    './dashboard.component.scss'
  ],
})
export class DashboardComponent implements OnInit {
  
  public sections:Array<any>;
  public campaignsDic: { [key: string]: Campaign[] };

  public recommendations_accepted:Campaign[];
  public recommendations:Campaign[];

  public get isGhosting():boolean{
    return this._apiSvc.isGhosting;
  }

  private readonly _logger: Logger;
  
  constructor(
    logSvc: ILogService,
    private readonly _prefSvc: IPreferenceService,
    private readonly _marketingSvc: IMarketingService,
    private readonly _apiSvc: ApiService,
    private readonly _modalSvc: IModalService,
    private readonly _deviceSvc: IDeviceService
  ) { 
    this._logger = logSvc.getLogger("DashboardComponent");

    this._marketingSvc.campaignsChanged$.subscribe(async ()=>{
      this.updateCampaigns();
    });

    this._prefSvc.subscribe(PreferenceType.DashboardLayout, layout => {
      this._logger.LogDebug("PreferenceType.DashboardLayout", "updated", layout);
      this.sections = layout?.value?.sections;
      this.updateCampaigns();
    });
  }

  public updateCampaigns(){
    
    this.recommendations = this._marketingSvc.getCampaigns("recommendations");
    this.recommendations_accepted = this._marketingSvc.getCampaigns("recommendations_accepted");

    this.campaignsDic = {};

    this.sections
      ?.filter(section => section["type"] == 'campaign')
      ?.forEach(section=>{

        const campaigns:Campaign[] = [];
        if(section["campaign_category"]) {
          campaigns.push(...this._marketingSvc.getCampaigns(section["campaign_category"]));
        }

        if(section["campaign"] && Array.isArray(section["campaign"])) {
          const campaign_ids:string[] = section["campaign"];
          campaigns.push(...campaign_ids.map(campaign=> this._marketingSvc.getCampaign(campaign)));
        }

        this.campaignsDic[section["id"]] = campaigns;
      });
  }

  public should_show_section(section): boolean {

    switch(section["type"]){

      case "campaign":
        return section.show_empty || this.campaignsDic[section.id]?.length > 0
      default:
        return true;
    }
  }

  public getCampaignsForSection(section):Campaign[]{
    return this.campaignsDic[section.id];
  }

  public should_show_section_header(section):boolean{
    const header = section["header"];
    return header?.title?.length > 0 || header?.description?.length > 0
  }

  public should_show_section_footer(section):boolean{
    const footer = section["footer"];
    return footer?.title?.length > 0 || footer?.description?.length > 0
  }

  ngOnInit() {}

  public async ionViewWillEnter() {

    this._logger.LogDebug("ionViewWillEnter");

    if (this._deviceSvc.is_Web) {
      return;
    }

    await StatusBar.setStyle({
      style: Style.Dark
    });
  }

  public async ionViewWillLeave() {
    this._logger.LogDebug("ionViewWillLeave");
    
    if (this._deviceSvc.is_Web) {
      return;
    }

    await StatusBar.setStyle({
      style: Style.Light
    });
  }

  public async onAcceptedRecommendationsClick(){
    this._modalSvc.open("recommendations_accepted", {
      component: CampaignListComponent,
      componentProps: {
        title: ["Your Saved","AI Recommendations"],
        categories: ["recommendations_accepted"]
      }
    })
  }

}
