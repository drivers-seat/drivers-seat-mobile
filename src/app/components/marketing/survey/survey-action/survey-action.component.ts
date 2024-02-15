import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CampaignAction } from 'src/app/models/Campaign';
import { SurveyItem } from 'src/app/models/Survey';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';

@Component({
  selector: 'survey-action',
  templateUrl: './survey-action.component.html',
  styleUrls: [
    '../../marketing.scss',
    '../survey.scss',
    './survey-action.component.scss'
  ],
})
export class SurveyActionComponent implements OnInit {

  private readonly _logger: Logger;

  @Input()
  public definition: SurveyItem

  @Output()
  public click: EventEmitter<CampaignAction> = new EventEmitter();


  constructor(
    logSvc: ILogService,
  ) {
    this._logger = logSvc.getLogger("SurveyActionComponent");
  }

  ngOnInit() { }

  public onClick(){
    this.click.emit(this.definition?.action);
  }

}
