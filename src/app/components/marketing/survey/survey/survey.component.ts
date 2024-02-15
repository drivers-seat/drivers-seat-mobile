import { Component, OnInit } from '@angular/core';
import { SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { StatusBar } from '@capacitor/status-bar';
import { LoadingController } from '@ionic/angular';
import { CampaignAction } from 'src/app/models/Campaign';
import { IDependencies, Survey, SurveyItem, SurveyItemType, SurveySection, SurveyValidation } from 'src/app/models/Survey';
import { IDeviceService } from 'src/app/services/device/device.service';
import { IExternalContentService } from 'src/app/services/external-content/external-content.service';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import { IMarketingService } from 'src/app/services/marketing/marketing.service';
import { IModalService } from 'src/app/services/modal/modal.service';

@Component({
  selector: 'app-survey',
  templateUrl: './survey.component.html',
  styleUrls: [
    '../../marketing.scss',
    '../survey.scss',
    './survey.component.scss'],
})
export class SurveyComponent implements OnInit {

  private readonly _logger: Logger;

  public campaignId: string;

  public resetToFirstPage: boolean = false;

  public enabled_sections: SurveySection[];
  public current_section: SurveySection;
  public content_url: SafeResourceUrl;
  public video_url: string;
  public content_html: SafeHtml;
  public hasExternalHtml: boolean;
  public get video_complete(): boolean {
    return this.current_section?.video_completed || false;
  }

  public get custom_actions(): CampaignAction[] {
    return this.current_section?.actions?.filter(a => !a.is_default && !a.is_header) || [];
  }

  public get default_actions(): CampaignAction[] {
    return this.current_section?.actions?.filter(a => a.is_default) || [];
  }

  public get hasHeaderActions():boolean{
    return this.closeAction != null || this.helpAction != null;
  }

  public get closeAction(): CampaignAction {
    return this.current_section
      ?.actions
      ?.filter(a=> a.is_header)
      ?.find(a=>a.type == 'dismiss' || a.type == 'close');
  }

  public get helpAction(): CampaignAction {
    return this.current_section
      ?.actions
      ?.filter(a=> a.is_header)
      ?.find(a=>a.type == 'help');
  }

  public get showHeader():boolean {
    return this.hasHeaderActions || this.current_section?.title?.length > 0;
  }

  private _survey: Survey;
  private _allFields: SurveyItem[];
  private _allFieldsMatrix: { [key: string]: SurveyItem[] };
  private _allValidations: { [key: string]: SurveyValidation };

  public state: {
    section: string,
    data: { [key: string]: any }
  }

  constructor(
    logSvc: ILogService,
    private readonly _marketingSvc: IMarketingService,
    private readonly _routeSvc: ActivatedRoute,
    private readonly _deviceSvc: IDeviceService,
    private readonly _loadingCtrl: LoadingController,
    private readonly _externalContentSvc: IExternalContentService,
    private readonly _modalSvc: IModalService
  ) {
    this._logger = logSvc.getLogger("SurveyComponent");

    this._routeSvc.paramMap
      .subscribe(params => {
        this.campaignId = params.get("id");
        this._logger.LogDebug("CampaignId", this.campaignId);
      });
  }

  ngOnInit() { }

  public async ionViewWillEnter() {
    this._logger.LogDebug("ionViewWillEnter");

    if (!this._deviceSvc.is_Web) {
      await StatusBar.hide();
    }

    if (!this.campaignId) {
      this._logger.LogWarning("ionViewDidEnter", "CampaignID is null");
      await this._modalSvc.dismiss(null, null, this.campaignId);
      return;
    }

    this._survey = await this._marketingSvc.getCampaign<Survey>(this.campaignId);

    if (!this._survey) {
      this._logger.LogWarning("ionViewDidEnter", "cant find campaign", this.campaignId);
      await this._modalSvc.dismiss(null, null, this.campaignId);
      return;
    }

    //Prevent future campaigns from popping up while looking at this one.
    this._marketingSvc.pause(this._survey.id);

    this._allValidations = {};
    this._survey.sections
      .filter(section => section.validations)
      .forEach(section => {
        Object.keys(section.validations).forEach(field => {
          this._allValidations[field] = section.validations[field];
        })
      });

    this._allFields = this._survey.sections
      .flatMap(s => s.items.filter(x => x.type != SurveyItemType.info && x.field))

    this._allFields.forEach(item => item.isRequired = this.isFieldRequired(item.field));

    this._allFieldsMatrix = {};
    this._allFields.forEach(f => {
      this._allFieldsMatrix[f.field] = this._allFieldsMatrix[f.field] || [];
      this._allFieldsMatrix[f.field].push(f);
    });

    this.processStateFromServer();
    this.updateEnabledStatus();
    this.updateEnabledSections();
    this.prepareStateForServer();
    this.updateValidationStatus();

    if (!this.resetToFirstPage) {
      const section = this.enabled_sections.find(x => x.id == this.state?.section);
      if (section) {
        this.setSection(section)
      }
    }

    if (!this.current_section) {
      this.current_section = this.enabled_sections[0];
    }

    if (this.current_section) {
      await this.handleSectionUrl(this.current_section);
    }

    this._logger.LogDebug("ionViewWillEnter", this.current_section);

    await this._marketingSvc.presentCampaign(this._survey.id, this._survey.state);
  }

  public async ionViewWillLeave() {
    this._logger.LogDebug("ionViewWillLeave");
    if (!this._deviceSvc.is_Web) {
      await StatusBar.show();
    }
  }

  public get showFooterLinks(): boolean {
    return this.default_actions?.length > 0;
  }

  public get showPagination(): boolean {
    return !this.current_section?.hide_page_markers || !this.current_section?.hide_page_navigation
  }

  public get showPageNavigation(): boolean {
    return !this.current_section?.hide_page_navigation;
  }

  public get showPageMarkers(): boolean {
    return !this.current_section?.hide_page_markers;
  }

  private processStateFromServer() {
    this.state = {
      section: this._survey.state?.section,
      data: {}
    }

    const stateData = this._survey.state?.data || {};
    this._allFields.forEach(f => {

      switch (f.type) {

        case SurveyItemType.option:
          this.state.data[f.field] = this.state.data[f.field] || {};
          this.state.data[f.field][f.value || true] = stateData[f.field] == f.value || false;
          break;

        case SurveyItemType.boolean:

          this._logger.LogDebug("boolean", stateData, stateData[f.field]);

          this.state.data[f.field] = this.state.data[f.field] || {};


          if(stateData[f.field] != null){
            if( Array.isArray(stateData[f.field])){
              this.state.data[f.field][f.value || true] = stateData[f.field].indexOf(f.value) > -1 || false;
            } else {
              this.state.data[f.field][f.value || true] = stateData[f.field] == f.value;
            }
          }
          break;

        default:
          this.state.data[f.field] = stateData[f.field] || null;
      }
    });

    //pass along any app review data
    Object.keys(stateData)
      .filter(k => k.startsWith("appReview_"))
      .forEach(k => {
        this._logger.LogDebug("processStateFromServer", "passing along", k, stateData[k]);
        this.state.data[k] = stateData[k]
      });
  }

  private prepareStateForServer() {

    const saveObj = {
      section: this.current_section?.id,
      data: {}
    };

    this._survey.sections
      .filter(section => section.isEnabled)
      .forEach(section => {

        if (section.video_completed != null) {
          saveObj.data[`video_${section.id}_completed`] = true;
        }

        if ((section.video_play_count || 0) > 0) {
          saveObj.data[`video_${section.id}_view_count`] = section.video_play_count;
        }

        if ((section.video_play_duration_seconds || 0) > 0) {
          saveObj.data[`video_${section.id}_view_duration`] = section.video_play_duration_seconds;
        }

        section.items
          .filter(item => item.type != SurveyItemType.info && item.field)
          .filter(field => field.isEnabled)
          .forEach(field => {

            if (!this.state.data[field.field]) {
              return;
            }

            switch (field.type) {

              case SurveyItemType.option:
                if (this.state.data[field.field][field.value || true] == true) {
                  saveObj.data[field.field] = field.value || true;
                }
                break;

              case SurveyItemType.boolean:

                if (this._allFieldsMatrix[field.field].length == 1) {
                  saveObj.data[field.field] = this.state.data[field.field][field.value || true] == true;
                } else {

                  if (this.state.data[field.field][field.value || true] == true) {
                    saveObj.data[field.field] = saveObj.data[field.field] || [];
                    saveObj.data[field.field].push(field.value || true);
                  }
                }
                break;

              default:
                saveObj.data[field.field] = this.state.data[field.field];
                break;
            }
          });
      });

    //pass along any app review data
    Object.keys(this.state.data)
      .filter(k => k.startsWith("appReview_"))
      .forEach(k => {
        this._logger.LogDebug("prepareStateForServer", "passing along", k, this.state.data[k]);
        saveObj.data[k] = this.state.data[k]
      });

    this._survey.state = saveObj;
  }

  private isItemEnabled(item: IDependencies) {

    if (!item.dependencies) {
      return true;
    }

    const dependsOnFields = Object.keys(item.dependencies);
    if (dependsOnFields.length == 0) {
      return true;
    }

    this._logger.LogDebug("isItemEnabled", item)

    let isEnabled = null;
    dependsOnFields.forEach(field => {

      if (isEnabled != null) {
        return;
      }

      const dependency = item.dependencies[field];

      const state = this.state.data[field];

      this._logger.LogDebug("isItemEnabled", field, state);

      //if there is an exclusion and the user has selected a value, disable
      if (dependency.exclude_values?.length > 0 && dependency.exclude_values.some(exVal => state == exVal || (state && state[exVal] == true))) {
        isEnabled = false;
        return;
      }

      //If there is inclusion
      if (dependency.include_values?.length > 0) {

        //If the user has a value, enable otherwise disable
        if (dependency.include_values.some(inVal => state == inVal || (state && state[inVal] == true))) {
          isEnabled = true;
          return;
        } else {
          isEnabled = false;
          return;
        }
      }

      isEnabled = true;
    });

    return isEnabled || false;
  }

  public async onValueChanged(item, newVal) {

    this._logger.LogDebug("onValueChanged", item, newVal);

    if (!item.field || item.type == SurveyItemType.info) {
      return;
    }

    let newState = this.state?.data[item.field];


    switch (item.type) {

      case SurveyItemType.boolean:
        newState = newState || {};
        newState[item.value != null ? item.value : true] = newVal;
        break;

      case SurveyItemType.option:
        newState = newState || {};

        //if true (which it should always be), set others to false
        if (newVal) {
          Object.keys(newState)
            .filter(k => k != item.value)
            .forEach(k => newState[k] = false);
        }

        newState[item.value] = newVal;
        break;

      default:
        newState = newVal;
        break;
    }

    this.state.data[item.field] = newState;

    this._logger.LogDebug("onValueChanged", this.state.data);

    this.updateEnabledStatus();
    this.updateEnabledSections();
    this.prepareStateForServer();
    this.updateValidationStatus();
  }

  public onItemHasFocused(item) {
    this._allFields.filter(x => x.field == item.field).forEach(x => x.hasFocused = true);
  }

  private updateEnabledStatus() {
    this._survey.sections.forEach(section => {
      section.isEnabled = this.isItemEnabled(section);

      section.items.forEach(item => {
        item.isEnabled = this.isItemEnabled(item);
      })
    })
  }

  private isFieldRequired(field: string) {
    return this._allValidations[field] && this._allValidations[field].required;
  }

  private isFieldValid(field: string, validation: SurveyValidation, allState: any): string[] {

    const vldErrors = [];
    const fieldState = allState.data[field];

    if (validation.required) {
      this._logger.LogDebug(field, fieldState)
      if (fieldState == null) {
        vldErrors.push("A value is required")
        return vldErrors;
      }

      if (Array.isArray(fieldState) && fieldState.length == 0) {
        vldErrors.push("A selection is required")
        return vldErrors;
      }
    }

    if (validation.min_value != null && fieldState < validation.min_value) {
      vldErrors.push(`Value cannot be less than ${validation.min_value}`);
    }

    if (validation.max_value != null && fieldState > validation.max_value) {
      vldErrors.push(`Value cannot be greater than ${validation.max_value}`);
    }

    if (validation.reg_ex) {
      const regEx = new RegExp(validation.reg_ex);
      if (!regEx.test(fieldState)) {
        vldErrors.push(`Value is incorrectly formatted`);
      }
    }

    return vldErrors;
  }

  private updateValidationStatus() {

    this._survey.sections
      .filter(section => section.isEnabled)
      .forEach(section => {

        let sectionIsValid = true;
        const sectionMessages: { [key: string]: string[] } = {};

        if (!section.validations) {
          return
        }

        Object.keys(section.validations).forEach(field => {

          const validations = section.validations[field];
          const messages = this.isFieldValid(field, validations, this._survey.state);

          this._allFields
            .filter(f => f.field == field)
            .forEach(f => {

              if (f.isEnabled) {

                f.isValid = messages.length == 0
                f.messages = messages

                sectionMessages[f.field] = messages;

              } else {
                f.isValid = true;
                f.messages = [];
              }

              sectionIsValid = sectionIsValid && f.isValid;
            });
        })
        section.isValid = sectionIsValid;
        section.messages = sectionMessages;
      });
  }

  private updateEnabledSections() {
    this.enabled_sections = this._survey.sections
      .filter(x => x.isEnabled);
  }

  private async setSectionIdx(idx) {

    if (this.enabled_sections.length <= idx) {
      await this.setSection(this.enabled_sections[this.enabled_sections.length - 1]);
      return;
    }

    await this.setSection(this.enabled_sections[idx]);
  }

  private async handleSectionUrl(section: SurveySection) {
    this.video_url = null;
    this.content_url = null;
    this.content_html = null;
    this.hasExternalHtml = false;

    if (this._externalContentSvc.isUrlVideoContent(section?.content_url)) {
      this.video_url = section.content_url;
    } else if (this._externalContentSvc.isUrlExternal(section.content_url)) {
      this.content_url = this._externalContentSvc.getSafeUrl(section.content_url);
    } else if (section.content_url){
      this.hasExternalHtml = true;
      this.content_html = await this._externalContentSvc.getExternalHtml(section.content_url);
    }
  }

  public async setSection(section: SurveySection) {

    this._logger.LogDebug("setSection");

    if (!this.canMoveToSection(section) || this.current_section == section) {
      return;
    }

    this.current_section = section;
    await this.handleSectionUrl(section);

    const spinnerCtrl = await this._loadingCtrl.create({
      message: "one moment please..."
    });

    await spinnerCtrl.present();

    try {
      this.prepareStateForServer();
      await this._marketingSvc.navigateOnSurvey(this._survey.id, this._survey.state);
    }
    finally {
      await spinnerCtrl.dismiss();
    }
  }

  public async onMoveNext() {

    this.current_section?.items
      .filter(x => x.field)
      .forEach(x => x.hasFocused = true);

    if (!this.canMoveNext()) {
      return;
    }

    let current_idx = this.enabled_sections.indexOf(this.current_section);

    if (current_idx < 0) {
      await this.setSectionIdx(0);
      return;
    }

    if (this.enabled_sections.length > current_idx + 1) {
      await this.setSectionIdx(current_idx + 1);
      return;
    }

    await this.setSectionIdx(current_idx);
  }

  public async onMovePrev() {

    if (!this.canMovePrev()) {
      return;
    }

    let current_idx = this.enabled_sections.indexOf(this.current_section);

    if (current_idx < 1) {
      await this.setSectionIdx(0);
      return;
    }

    await this.setSectionIdx(current_idx - 1);
  }

  public async onVideoStart() {
    this.current_section.video_play_count = (this.current_section.video_play_count || 0) + 1;
    this._logger.LogDebug("onVideoStart", "total count", this.current_section.video_play_count);
  }

  public async onVideoReplay() {

  }

  public async onVideoEnd(duration) {
    this.current_section.video_completed = true;
    this.current_section.video_play_duration_seconds = (this.current_section.video_play_duration_seconds || 0) + (duration || 0);
    this._logger.LogDebug("onVideoEnd", duration, "total duration", this.current_section.video_play_duration_seconds);
  }

  public canMoveToSection(section: SurveySection) {

    const idx = this.enabled_sections.indexOf(section)
    const current_idx = this.enabled_sections.indexOf(this.current_section);

    if (idx <= current_idx) {
      return true;
    }

    const anyPrevInvalid = this.enabled_sections
      .slice(0, idx)
      .some(x => !x.isValid)


    return !anyPrevInvalid;
  }

  public canMoveNext() {

    if (!(this.enabled_sections?.length > 0)) {
      return false;
    }

    const current_idx = this.enabled_sections.indexOf(this.current_section);

    if (current_idx + 1 >= this.enabled_sections.length) {
      return false;
    }

    return this.canMoveToSection(this.enabled_sections[current_idx + 1]);
  }

  public canMovePrev() {

    if (!(this.enabled_sections?.length > 0)) {
      return false;
    }

    const current_idx = this.enabled_sections.indexOf(this.current_section);

    return current_idx > 0;
  }

  public onCompleteSurvey() {

    this.current_section?.items
      .filter(x => x.field)
      .forEach(x => x.hasFocused = true);

    this.updateValidationStatus();

    if (!this.current_section.isValid) {
      return;
    }
  }


  public isLastPage() {

    if (!this.current_section) {
      return true;
    }

    const current_idx = this.enabled_sections.indexOf(this.current_section);

    return (current_idx + 1) == this.enabled_sections.length;
  }

  public isFirstPage() {

    if (!this.current_section) {
      return true;
    }

    const current_idx = this.enabled_sections.indexOf(this.current_section);

    return current_idx == 0;
  }


  public async handleButton(action: CampaignAction) {

    this._logger.LogDebug("handleButton", action);

    switch (action.type) {
      case 'next':
        await this.onMoveNext();
        return;

      case 'prev':
        await this.onMovePrev();
        return;
    }

    const spinnerCtrl = await this._loadingCtrl.create({
      message: "one moment please..."
    });

    await spinnerCtrl.present();

    try {
      this.updateEnabledStatus();
      this.updateEnabledSections();
      this.prepareStateForServer();
      await this._marketingSvc.handleCampaignAction(this._survey.id, action, this._survey.state);
    }
    finally {
      await spinnerCtrl.dismiss();
    }
  }
}