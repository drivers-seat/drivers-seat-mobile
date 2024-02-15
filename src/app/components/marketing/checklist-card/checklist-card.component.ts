import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { LoadingController } from '@ionic/angular';
import { CampaignAction, Checklist, ChecklistItem } from 'src/app/models/Campaign';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import { IMarketingService } from 'src/app/services/marketing/marketing.service';

@Component({
  selector: 'checklist-card',
  templateUrl: './checklist-card.component.html',
  styleUrls: [
    '../marketing.scss',
    '../campaign-card/campaign-card.component.scss',
    './checklist-card.component.scss'
  ]
})
export class ChecklistCardComponent implements OnInit {

  private readonly _logger: Logger
  
  private _checklist:Checklist;
  private _custom_class: string[];
  
  public show_progress: boolean;

  public complete: void[];
  public in_process: void[];
  public req_attn: void[];
  public not_started: void[];

  public display_class:string[];


  @Input("campaign")
  public get checklist(): Checklist{
    return this._checklist;
  }

  public set checklist(checklist:Checklist){
    this._checklist = checklist;
    this.updateChecklist();
  }

  @Input()
  public get custom_class(): string[] {
    return this._custom_class;
  }

  public set custom_class(custom_class:string[]){
    this._custom_class = custom_class
    this.updateChecklist();
  }


  @Output()
  public onAction: EventEmitter<CampaignAction> = new EventEmitter();


  constructor(
    logSvc: ILogService,
    private readonly _marketingSvc: IMarketingService,
    private readonly _loadingCtrl: LoadingController
  ) { 
    this._logger = logSvc.getLogger("ChecklistCardComponent");
  }

  ngOnInit() {}

  private updateChecklist(){

    this.display_class = [];
    if(this.checklist){
      this.display_class.push(
        this.checklist.type, 
        this.checklist.status, 
        this.checklist.id, 
        ...this.checklist.categories || [],
        ...this.checklist.display_class || [],
        ...this.custom_class || []
      );
    }

    const countItems = this._checklist?.items?.length || 0;
    this.show_progress = countItems > 0;

    if(!this._checklist?.show_progress || countItems == 0){
      this.complete = null;
      this.in_process= null;
      this.not_started = null;
      this.req_attn = null;
      return;
    }

    const count_complete = this._checklist.items
      .filter(x=>x.status == "complete")
      .length;

    this.complete = new Array(count_complete);

    const count_in_process = this._checklist.items
      .filter(x=>x.status == "in_process")
      .length;
    
    this.in_process = new Array(count_in_process);

    const count_req_attn = this._checklist.items
      .filter(x=>x.status == "requires_attention")
      .length;

    this.req_attn = new Array(count_req_attn);

    const count_not_started = countItems - count_complete - count_in_process - count_req_attn;
    this.not_started = new Array(count_not_started);
  }

  public getStatusIconName(status: string) :string{
    switch(status){
      case "new":
      case "not_started":
        return "ellipse-outline";

      case "in_process":
        return "ellipsis-horizontal-circle";

      case "complete":
        return "checkmark-circle";

      case "requires_attention":
        return "alert-circle";

      case "unknown":
      default:
        return "help-circle";
    }
  }

  public async onActionClick(action: CampaignAction){
    this._logger.LogDebug("onActionClick", action);

    if(!action){
      return;
    }
    
    const spinnerCtrl = await this._loadingCtrl.create({
      message: "one moment please..."
    });

    try {
      await spinnerCtrl.present();
      await this._marketingSvc.handleCampaignAction(this.checklist?.id, action, this.checklist.state);
    }
    finally {
      await spinnerCtrl.dismiss();
    }
  }
}
