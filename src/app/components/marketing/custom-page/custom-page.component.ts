import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Campaign } from 'src/app/models/Campaign';
import { ApiService } from 'src/app/services/api.service';
import { IBrowserNavigationService } from 'src/app/services/browser-navigation/browser-navigation.service';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import { IMarketingService } from 'src/app/services/marketing/marketing.service';
import { IModalService } from 'src/app/services/modal/modal.service';
import { IPreferenceService } from 'src/app/services/preferences/preferences.service';

@Component({
  selector: 'custom-page',
  templateUrl: './custom-page.component.html',
  styleUrls: [
    '../marketing.scss',
    './custom-page.component.scss'
  ],
})
export class CustomPageComponent implements OnInit {

  private readonly _logger: Logger;
  private _prefTypeCode: string;

  public sections: Array<any>;
  public campaignsDic: { [key: string]: Campaign[] };
  public title: string[];
  public description: string[];

  public get isGhosting():boolean {
    return this._apiSvc.isGhosting;
  }

  @Input()
  public get prefTypeCode():string{
    return this._prefTypeCode;
  }

  public isModal: boolean = false;

  public set prefTypeCode(prefTypeCode: string) {
    if(this._prefTypeCode == prefTypeCode){
      return;
    }

    this._prefTypeCode = prefTypeCode;
  
    if(this._prefTypeCode){
      this._prefSvc.subscribe(this._prefTypeCode, (layout)=>{
        this._logger.LogDebug("PreferenceType",this._prefTypeCode, "updated", layout);
        this.sections = layout?.value?.sections;
        this.title = layout?.value?.title;
        this.description = layout?.value?.description;
        this.updateCampaigns();
      });
    }
  }
  
  constructor(
    logSvc: ILogService,
    private readonly _apiSvc: ApiService,
    private readonly _prefSvc: IPreferenceService,
    private readonly _routeSvc: ActivatedRoute,
    private readonly _marketingSvc: IMarketingService,
    private readonly _modalSvc: IModalService,
    private readonly _browswerNavSvc: IBrowserNavigationService
  ) { 
    this._logger = logSvc.getLogger("CustomPageComponent");

    this._routeSvc.paramMap
      .subscribe(params => {
        const prefType = params.get("prefTypeCode");
        if(prefType){
          this.prefTypeCode = prefType;
        }
        this._logger.LogDebug("Route Path", "prefType", this.prefTypeCode);
      });
  }

  public updateCampaigns(){
    
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

  public async onCancelClick(){
    if(this.isModal){
      await this._modalSvc.dismiss(null, null, this._prefTypeCode)
      return;
    }

    await this._browswerNavSvc.navigateBack()
  }

  

  ngOnInit() {
  }

}
