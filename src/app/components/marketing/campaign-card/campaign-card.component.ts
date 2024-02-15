import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Campaign, CampaignAction } from 'src/app/models/Campaign';
import { IDescriptor } from 'src/app/models/Survey';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import { IMarketingService } from 'src/app/services/marketing/marketing.service';

@Component({
  selector: 'campaign-card',
  templateUrl: './campaign-card.component.html',
  styleUrls: [
    '../marketing.scss',
    './campaign-card.component.scss',
    './campaign-card.component.custom.scss'
  ],
})
export class CampaignCardComponent implements OnInit {

  private readonly _logger: Logger;

  private _title:string[];
  private _actions:CampaignAction[];

  @Input()
  public display_class: string[];

  
  @Input()
  public get title():string[]{
    return this._title;
  }

  public set title(descriptor:string[]){
    this._title = descriptor;
    this.updateCampaign();
  }


  @Input()
  public get actions():CampaignAction[]{
    return this._actions;
  }

  public set actions(actions: CampaignAction[]){
    this._actions = actions;
    this.updateCampaign();
  }

  @Output()
  public onAction: EventEmitter<CampaignAction> = new EventEmitter();


  public showHeader: boolean;
  public showFooter: boolean;

  public hasHeaderActions:boolean;
  public closeAction?: CampaignAction;
  public helpAction?:CampaignAction;

  public footerActions: CampaignAction[];
  public bodyActions: CampaignAction[];

  public getActionClass(action: CampaignAction):string[]{

    return [
      action.type,
      action.id,
      ...(action?.display_class || [])
    ];
  }

  constructor(
    logSvc: ILogService,
    private readonly _marketingSvc: IMarketingService
  ) { 
    this._logger = logSvc.getLogger("CampaignCardComponent");
  }

  ngOnInit() {}

  private updateCampaign(){

    this.closeAction = null;
    this.helpAction = null;
    this.helpAction=null;
    this.footerActions = [];
    this.bodyActions = [];
    this.hasHeaderActions = false;
    this.showHeader = false;
    this.showFooter = false;

    this.closeAction = this._actions?.find(a=>a.is_header && a.type == 'dismiss')
    this.helpAction = this._actions?.find(a=>a.is_header && a.type == 'help')
    this.hasHeaderActions = this.closeAction != null || this.helpAction != null;

    this.footerActions = this._actions?.filter(a=>a.is_default) || [];
    this.bodyActions = this._actions?.filter(a => !a.is_header && !a.is_default) || [];

    this.showHeader = this.hasHeaderActions || this._title?.length > 0
    this.showFooter = this.footerActions.length > 0 || this.bodyActions.length > 0
  }

  public async onActionClick(action:CampaignAction){

    if(!action){
      return;
    }

    this._logger.LogDebug("onActionClick", action);

    this.onAction.emit(action);
  }


}
