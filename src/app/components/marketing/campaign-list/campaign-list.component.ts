import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Campaign } from 'src/app/models/Campaign';
import { IBrowserNavigationService } from 'src/app/services/browser-navigation/browser-navigation.service';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import { IMarketingService } from 'src/app/services/marketing/marketing.service';
import { IModalService } from 'src/app/services/modal/modal.service';

@Component({
  selector: 'app-campaign-list',
  templateUrl: './campaign-list.component.html',
  styleUrls: [
    '../marketing.scss',
    './campaign-list.component.scss'],
})
export class CampaignListComponent implements OnInit {

  private readonly _logger: Logger;  

  public isModal: boolean;
  public modalId: string;

  @Input()
  public campaigns:Campaign[];


  private _categories: string[];
  @Input()
  public get categories():string[]{
    return this._categories;
  }

  public set categories(categories:string[]){
    this._categories = categories;
    this.setCategories();
  }

  @Input()
  public title:String[];

  @Input()
  public description:string[];

  constructor(
    logSvc: ILogService,
    private readonly _marketingSvc: IMarketingService,
    private readonly _routeSvc: ActivatedRoute,
    private readonly _modalSvc: IModalService,
    private readonly _browserNavSvc: IBrowserNavigationService
  ) { 
    this._logger = logSvc.getLogger("CampaignListComponent");

    this._routeSvc.queryParams.subscribe(async params => {

      if(params["category"]){
        this.categories = params["category"];
      }

      if(params["title"]){
        this.title = [params["title"]];
      }

      if(params["description"]){
        this.description = [params["description"]];
      }
    });

    this._marketingSvc.campaignsChanged$.subscribe(()=>{

      //If specified by a category filter, refresh the list
      //otherwise, it's the responsibility of the caller to do this.
      if(this.categories){
        this.setCategories();
      }
    });
  }

  ngOnInit() {}

  private setCategories(){
    this.campaigns = this._marketingSvc.getCampaigns(this._categories);
  }

  public onCancel(){

    if(this.isModal && this.modalId){
      this._modalSvc.dismiss(null,null,this.modalId);
    } else {
      this._browserNavSvc.navigateBack();
    }
  }
}
