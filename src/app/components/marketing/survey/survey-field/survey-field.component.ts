import { Component, ElementRef, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { SafeResourceUrl } from '@angular/platform-browser';
import { Chart } from 'chart.js';
import { format, startOfDay } from 'date-fns';
import { SurveyItem, SurveyItemType } from 'src/app/models/Survey';
import { IExternalContentService } from 'src/app/services/external-content/external-content.service';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';

@Component({
  selector: 'survey-field',
  templateUrl: './survey-field.component.html',
  styleUrls: [
    '../../marketing.scss',
    '../survey.scss',
    './survey-field.component.scss'
  ],
})
export class SurveyFieldComponent implements OnInit {


  private readonly _logger: Logger;

  @Input()
  public definition:SurveyItem

  private _value: any;
  @Input()
  public set value(val:any){
    
    if(val != this._value){
      this._value = val;
      this.internalVal = val;
      this.onValueChanged();
    }
  }

  public get value(): any { return this._value; }

  @Output()
  public valueChange: EventEmitter<any> = new EventEmitter();

  @Output()
  public onTouched: EventEmitter<void> = new EventEmitter();

  public internalVal: any;

  public get safeUrl(): SafeResourceUrl{
    if(!this.definition?.url){
      return null;
    }

    return this._externalContentSvc.getSafeUrl(this.definition.url);
  }

  constructor(
    logSvc: ILogService,
    private readonly _externalContentSvc: IExternalContentService
  ) { 
    this._logger = logSvc.getLogger("SurveyFieldComponent");
  }

  ngOnInit(): void {
      
  }

  public onValueChanged(){

    switch(this.definition.type){
      case SurveyItemType.numeric:
        this.onNumericChanged();
        break;
      case SurveyItemType.boolean:
      case SurveyItemType.option:
      case SurveyItemType.segment_options:
        this.onToggle(this.internalVal);
        break;
      case SurveyItemType.long_text:
      case SurveyItemType.short_text:
        this.onTextChanged();
      case SurveyItemType.date:
        this.onDateChanged();
    }
  }

  public onNumericChanged(){
    const scale = this.definition?.scale || 0
    this.internalVal = parseFloat(`${this.internalVal}`).toFixed(scale);
    
    let newValue = parseFloat(this.internalVal);

    if(isNaN(newValue)){
      newValue = null;
    }

    if (this.value == newValue){
      return;
    }
    this.value = newValue;
    this.valueChange.emit(newValue);
  }

  public onTextChanged(){
    
    this.internalVal = (this.internalVal || "").trim();

    if(this.value == this.internalVal){
      return;
    }

    this.value = this.internalVal;
    this.valueChange.emit(this.internalVal);
  }

  public onDateChanged(){
    
    if(this.internalVal == this.value){
      return;
    }

    this.value = this.internalVal;
    this.valueChange.emit(this.internalVal);
  }

  public onTodayClick(){

    if(!this.definition.isEnabled){
      return;
    }

    this.internalVal = format(startOfDay(new Date()),"yyyy-MM-dd");
    this.onDateChanged();
    this.onInputBlur();
  }

  public onToggle(newVal){

    //once a radio is selected, keep its value
    if(this.definition.type == SurveyItemType.option && !newVal){
      return;
    }

    this.internalVal = newVal;

    if(this.value == this.internalVal){
      return;
    }

    this.value = this.internalVal;
    this.valueChange.emit(this.internalVal);

    this.onInputBlur();
  }

  public clearSelection(){
    this.internalVal = null;
    if(this.value == this.internalVal){
      return;
    }
    this.valueChange.emit(this.internalVal);
    this.onInputBlur();
  }

  public onInputBlur(){
    this.onTouched.emit();
  }
}
