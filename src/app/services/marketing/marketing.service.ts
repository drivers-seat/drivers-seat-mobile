import { Injectable } from '@angular/core';
import { ILogService } from '../logging/log.service';
import { Logger } from '../logging/logger';
import { ApiService } from '../api.service';
import { UserService } from '../user.service';
import { Campaign, CampaignAction, CampaignPopup, CampaignPopupAction, CampaignPreview, Checklist, ChecklistItem, ContentCTACampaign, IActionable } from 'src/app/models/Campaign';
import { User } from 'src/app/models/User';
import { HttpClient } from '@angular/common/http';
import { IBrowserNavigationService } from '../browser-navigation/browser-navigation.service';
import { UserTrackingService } from '../user-tracking/user-tracking.service';
import { IDescriptor, Survey, SurveyItem, SurveyItemType, SurveyOption as SurveyItemOption, SurveySection, SurveyValidation, Dependency as SurveyDependency, Dependency, ChartOptions } from 'src/app/models/Survey';
import { AppRate, AppRatePromptType, AppRatePreferences } from '@awesome-cordova-plugins/app-rate/ngx';
import { IDeviceService } from '../device/device.service';
import { IModalService } from '../modal/modal.service';
import { CallToActionComponent } from 'src/app/components/marketing/call-to-action/call-to-action.component';
import { SurveyComponent } from 'src/app/components/marketing/survey/survey/survey.component';
import { InAppBrowser } from '@awesome-cordova-plugins/in-app-browser/ngx';
import { BehaviorSubject } from 'rxjs';
import { IGigAccountManagementService } from '../gig-account-management/gig-account-management.service';
import { IGoalTrackingService } from '../goal-tracking/goal-tracking.service';
import { ILocationTrackingService } from '../location-tracking/location-tracking.service';
import { parse } from 'date-fns';
import { IExternalContentService } from '../external-content/external-content.service';
import { AlertButton, AlertOptions } from '@ionic/core';
import { IUserSupportService } from '../user-support/user-support.service';
import { Platform } from '@ionic/angular';
import { environment } from 'src/environments/environment';

export abstract class IMarketingService {

  public abstract campaignsChanged$: BehaviorSubject<void>;
  public abstract getCampaigns(category: string | string[]): Campaign[];
  public abstract getCampaign<T extends Campaign>(id: string): T;
  public abstract pause(key: string): void;
  public abstract resume(key: string): void;
  public abstract presentCampaign(campaign_id: string, additional_data?: any): Promise<void>;
  public abstract handleCampaignAction(campaign_id, action: CampaignAction, additional_data: any, ignore_back_navigation?: boolean): Promise<void>;
  public abstract saveCampaignState(campaign_id: string, additional_data?: any): Promise<void>;
  public abstract navigateOnSurvey(campaign_id: string, additional_data?: any): Promise<void>;
  public abstract reviewApp(state?: any): Promise<void>;
}

@Injectable({
  providedIn: 'root'
})
export class MarketingService implements IMarketingService {


  public campaignsChanged$: BehaviorSubject<void> = new BehaviorSubject(null);

  private readonly _postponeMinutesDefault = 60 * 24;
  private readonly _minDelayBetweenCampaignsSeconds = 60;
  private readonly _refreshCampaignsFrequencySeconds = 180;
  private readonly _interrupt_exclude_statuses = ["postponed", "accepted", "dismissed"];
  private readonly _logger: Logger
  private _currentUser: User;

  public get appDisplayName(): string { return environment.appDisplayName; }

  private _pauseClaims: { [key: string]: Date } = {}

  private get _isPaused(): boolean {
    return Object.keys(this._pauseClaims).length > 0
  }

  private readonly _campaign_id_app_review = "app_review";

  private _allCampaigns: Campaign[];
  private _campaignsByCategory: {[key: string]: Campaign[]};
  private _refreshCampaignsInProcess: Promise<void> = null;

  constructor(
    logSvc: ILogService,
    private readonly _apiSvc: ApiService,
    private readonly _httpSvc: HttpClient,
    private readonly _navSvc: IBrowserNavigationService,
    private readonly _userSvc: UserService,
    private readonly _userTrackingSvc: UserTrackingService,
    private readonly _userSupportSvc: IUserSupportService,
    private readonly _appReviewSvc: AppRate,
    private readonly _deviceSvc: IDeviceService,
    private readonly _browser: InAppBrowser,
    private readonly _modalSvc: IModalService,
    private readonly _gigAcctMgmtSvc: IGigAccountManagementService,
    private readonly _goalSvc: IGoalTrackingService,
    private readonly _browserNavSvc: IBrowserNavigationService,
    private readonly _externalContentSvc: IExternalContentService,
    private readonly _platformSvc: Platform,
    private readonly _locationTrakingSvc: ILocationTrackingService) {

    this._logger = logSvc.getLogger("MarketingService")

    this._userSvc.currentUser$.subscribe(async u => {
      const oldUser = this._currentUser;
      this._currentUser = u;

      if (oldUser?.id != this._currentUser?.id
        || (oldUser?.agreed_to_current_terms != this._currentUser?.agreed_to_current_terms)
        || (oldUser?.isRequiredProfileComplete != this._currentUser?.isRequiredProfileComplete)) {

        this._logger.LogDebug("User Changed",
          oldUser?.isRequiredProfileComplete, this._currentUser?.isRequiredProfileComplete,
          oldUser?.agreed_to_current_terms, this._currentUser?.agreed_to_current_terms);

        this._allCampaigns = null;
        this._campaignsByCategory = null;
        this._pauseClaims = {};          

        if (this._apiSvc.isGhosting || (this._currentUser?.agreed_to_current_terms && this._currentUser.isRequiredProfileComplete)) {
          await this.requestRefreshCampaigns(true);
        }
      }
    });

    setInterval(async () => this.requestRefreshCampaigns(true), this._refreshCampaignsFrequencySeconds * 1000);

    this._platformSvc.resume.subscribe((async ()=> await this.requestRefreshCampaigns(true)));

    this.requestRefreshCampaigns(true);

    this._gigAcctMgmtSvc.linkedAccounts$.subscribe(async ()=>{
      this._logger.LogDebug("GigAcctMgmtSvc", "linkedAccounts$ changed")
      await this.requestRefreshCampaigns();
    });

    this._goalSvc.goalsChanged$.subscribe(async ()=>{
      this._logger.LogDebug("GoalsSvc", "goalsChanged$ changed")
      await this.requestRefreshCampaigns();
    });

    this._locationTrakingSvc.authAllowTrack_Always$.subscribe(async ()=>{
      this._logger.LogDebug("LocationTrackingSvc", "authAllowTrack_Always$ changed")
      await this.requestRefreshCampaigns();
    });

    this._locationTrakingSvc.authAllowPreciseLocation$.subscribe(async ()=>{
      this._logger.LogDebug("LocationTrackingSvc", "authAllowPreciseLocation$ changed")
      await this.requestRefreshCampaigns();
    });
  }

  public getCampaigns(category: string | string[]): Campaign[] {

    if(!this._campaignsByCategory){
      return [];
    }
    if (Array.isArray(category)){
      return this._allCampaigns
        .filter(campaign => campaign.categories.some(cmpCat=> category.indexOf(cmpCat) >= 0));
    } else {
      return this._campaignsByCategory[category] || [];
    }
  }

  public pause(key: string) {
    this._pauseClaims[key] = new Date();
  }

  public async resume(key: string) {
    delete this._pauseClaims[key];
    this._logger.LogDebug("resume", key, this._pauseClaims);
    await this.handleInterruptCampaign();
  }

  public getCampaign<T extends Campaign>(id: string): T {
    return this._allCampaigns?.find(c => c.id == id) as T;
  }

  public async presentCampaign(campaign_id: string, additional_data: any = null): Promise<void> {
    const url = `${this._apiSvc.url()}/marketing/campaigns/${campaign_id}/presented`
    const postModel = {
      additional_data: additional_data == null ? null : { ...additional_data }
    }

    const apiPromise = this._httpSvc.post(url, postModel).toPromise()

    await Promise.all([
      apiPromise,
      this._userTrackingSvc.captureCampaignEvent(campaign_id, "present", null, this.getTrackingEventData(additional_data))
    ]);

    const data = await apiPromise;
    this.handleCampaignResult(data);
    await this.handleInterruptCampaign();
  }

  public async handleCampaignAction(campaign_id: string, action: CampaignAction, additional_data: any = null, ignore_back_navigation: boolean = false): Promise<void> {

    this._logger.LogDebug("handleCampaignAction", campaign_id, action)

    const reengage_delay_seconds = action.reengage_delay_seconds == null
      ? this._minDelayBetweenCampaignsSeconds
      : action.reengage_delay_seconds;

    const url = `${this._apiSvc.url()}/marketing/campaigns/${campaign_id}/accepted`
    const postModel: any = {
      action_id: action.id,
      additional_data: additional_data == null ? null : { ...additional_data }
    };

    const eventModel = this.getTrackingEventData(additional_data) || {};

    let postUrl = "";
    let shouldCloseCampaign = true;
    switch (action.type) {
      case "accept":
        postUrl = `${this._apiSvc.url()}/marketing/campaigns/${campaign_id}/accepted`;
        break;

      case "dismiss":
        postUrl = `${this._apiSvc.url()}/marketing/campaigns/${campaign_id}/dismissed`;
        break;

      case "postpone":
        postUrl = `${this._apiSvc.url()}/marketing/campaigns/${campaign_id}/postponed`;
        postModel.postpone_minutes = action.postpone_minutes || this._postponeMinutesDefault;
        eventModel["postpone_minutes"] = postModel.postpone_minutes;
        break;

      case "close":
        postUrl = `${this._apiSvc.url()}/marketing/campaigns/${campaign_id}/custom`;
        break;

      case "help":
        postUrl = `${this._apiSvc.url()}/marketing/campaigns/${campaign_id}/custom`;
        shouldCloseCampaign = false;
        break;

      case "custom":
      case "help":
        shouldCloseCampaign = false;
        postUrl = `${this._apiSvc.url()}/marketing/campaigns/${campaign_id}/custom`;
        break;

      case "detail":
        const campaign = this.getCampaign(campaign_id);
        if(campaign){
          await this.showCampaignView(campaign, true);
        }
        return;

      case "logout":
        await this.logoutOnCampaign(campaign_id, action, additional_data)
        return;

      default:
        this._logger.LogWarning("handleCampaignAction", action.type, "Not supported")
        return;
    }

    if (!this._apiSvc.isGhosting && postUrl) {
      const apiPromise = this._httpSvc.post(postUrl, postModel).toPromise()
      const promises: Promise<any>[] = [
        apiPromise,
        this._userTrackingSvc.captureCampaignEvent(campaign_id, action.type, action.id, eventModel)
      ];

      await Promise.all(promises);

      const data = await apiPromise;
      this.handleCampaignResult(data);
      await this.handleInterruptCampaign();
    }

    await this.handleHelp(campaign_id, action);

    await this.handleNavigation(campaign_id, action);

    await this.handlePopup(campaign_id, action);

    if (shouldCloseCampaign) {
      if (reengage_delay_seconds > 0) {
        setTimeout(async () => {
          await this.resume(campaign_id);
        }, reengage_delay_seconds * 1000);
      } else {
        await this.resume(campaign_id);
      }

      const modal_closed = await this._modalSvc.dismiss(null, null, campaign_id);
      this._logger.LogDebug("modal_closed", campaign_id, modal_closed);
      if(!modal_closed && !ignore_back_navigation){
        this._browserNavSvc.navigateBack();
      }
    }
  }

  private async handleHelp(campaignId: string, action: CampaignAction){
    
    if(action.type != 'help'){
      return;
    }

    this._logger.LogDebug("Handling Help Request", campaignId, action);

    const messageTxt = action.data?.message_text
      ? action.data.message_text
      : `I need help with ${campaignId}/${action.id}`;

    await this._userSupportSvc.composeMessage(`Campaign Help - ${campaignId}`, messageTxt);
  }

  private async handleNavigation(campaignId: string, action: CampaignAction) {

    if (action.url == null){
      return;
    } 
    
    //If no url or its an internal url
    if (!this._externalContentSvc.isUrlExternal(action.url)) {
      await this._navSvc.requestNavigation(false, false, false, action.url);
      return;
    }

    //If an external URL, open in popup
    this._browser.create(action.url, "_system", {
      location: 'no'
    });
  }

  private async handlePopup(campaign_id: string, action: CampaignAction) {

    const popup = action.popup_message;
    if(!popup) {
      return;
    }

    const buttons = popup.actions.map(action => {

      const button:AlertButton = {
        text: action.text,
        id: action.id,
        role: action.url
      }

      return button;
    });

    const alertOptions: AlertOptions = {
      id: action.id,
      buttons: buttons,
    }
    
    if(popup.title){
      alertOptions.header = popup.title[0]

      if(popup.title.length > 1){
        alertOptions.subHeader = popup.title.slice(1).map(x=>`<p>${x}</p>`).join("");
      }
    }

    if(popup.description){
      alertOptions.message = popup.description.map(x=>`<p>${x}</p>`).join("");
    }

    const alertObj = await this._modalSvc.open_alert(alertOptions.id, alertOptions);
    
    const alertResult = await alertObj.onDidDismiss();
    this._logger.LogDebug("handlerPopup","alert result", alertResult);

    if(alertResult.role && alertResult.role != "cancel" && alertResult.role != ""){

      if(this._externalContentSvc.isUrlExternal(alertResult.role)){
        this._browser.create(alertResult.role, "_system", {
          location: 'no'
        });
      } else {
        this._browserNavSvc.requestNavigation(false, false, false, alertResult.role);
      }
    }
  }

  public async logoutOnCampaign(campaign_id: string, action: CampaignAction, additional_data: any = null): Promise<void> {

    await Promise.all([
      this.saveCampaignState(campaign_id, additional_data),
      this._userTrackingSvc.captureCampaignEvent(campaign_id, "logout", action.id, this.getTrackingEventData(additional_data))
    ]);

    await this._apiSvc.removeAuthToken();
    this.resume(campaign_id);
  }

  public async saveCampaignState(campaign_id: string, additional_data?: any): Promise<void> {
    const url = `${this._apiSvc.url()}/marketing/campaigns/${campaign_id}`

    const postModel = {
      additional_data: additional_data == null ? null : { ...additional_data }
    }

    await this._httpSvc.post(url, postModel).toPromise()
  }

  public async navigateOnSurvey(campaign_id: string, additional_data?: any): Promise<void> {

    await Promise.all([
      this.saveCampaignState(campaign_id, additional_data),
      this._userTrackingSvc.captureCampaignEvent(campaign_id, "navigate", null, this.getTrackingEventData(additional_data))
    ]);
  }

  private getTrackingEventData(additional_data): any {

    if (!additional_data) {
      return null;
    }

    if (Object.keys(additional_data).length == 0) {
      return null;
    }

    let result = { ...additional_data, ...additional_data?.data };
    Object.keys(result).forEach(k => {

      if (result[k] == null) {
        delete result[k];
        return;
      }

      if (Array.isArray(result[k])) {
        result[k] = result[k].join(", ");
        return;
      }

      if (typeof result[k] === 'object') {
        delete result[k];
      }
    })

    return result;
  }

  
  private async requestRefreshCampaigns(forceRefresh: boolean = false) : Promise<void> {

    if (this._refreshCampaignsInProcess && !forceRefresh) {
      this._logger.LogDebug("requestRefreshCampaigns", "skipped b/c in-process");
      return;
    }

    this._logger.LogDebug("requestRefreshCampaigns");

    try {
      this._refreshCampaignsInProcess = this.refreshCampaigns();
      await this._refreshCampaignsInProcess
    } finally {
      this._refreshCampaignsInProcess = null;
    }
  }

  private async refreshCampaigns(): Promise<void> {

    this._logger.LogDebug("refreshCampaigns");

    if (!this._apiSvc.isGhosting && (!this._userSvc.currentUser?.agreed_to_current_terms || !this._userSvc.currentUser?.isRequiredProfileComplete)) {

      this._logger.LogDebug("refreshCampaigns", "exiting b/c ghosting or current user is not complete");

      this._allCampaigns = null;
      this._campaignsByCategory = null;
      this.campaignsChanged$.next();
      return;
    }

    const data = await this._httpSvc.get(`${this._apiSvc.url()}/marketing/campaigns`).toPromise()
    this.handleCampaignResult(data);
    
    //handle interrupt deals with ghosting
    await this.handleInterruptCampaign();
  }

  private async handleInterruptCampaign() {

    if (this._isPaused) {
      return;
    }

    if (this._apiSvc.isGhosting) {
      return;
    }

    const campaigns = this.getCampaigns("interrupt")
      .filter(c=>c.status != "postponed")
      .filter(c=>c.status != "dismissed")
      .filter(c=>c.status != "accepted")
      
    if (campaigns.length == 0){
      return;
    }

    for (let i = 0; i < campaigns.length; i++) {
      const campaign = campaigns[i];

      this._logger.LogDebug("handleInterruptCampaign", campaign.id);
      if (await this.showCampaignView(campaign)) {
        return;
      }
    }
  }

  private handleCampaignResult(data: any): void {

    this._logger.LogDebug("handleCampaignResult", "data", data)

    this._allCampaigns = (data && data["data"])
    ? data["data"]
      .filter(x=>x != null)
      .map(x => this.parseCampaign(x))
      .filter(x => x != null)
    : new Array<Campaign>();

    this._campaignsByCategory = {};

    this._allCampaigns.forEach(campaign => {
      campaign.categories?.filter(x=>x != null)
        .forEach(category => {

        switch(category){
          case "interrupt":

            if (this._interrupt_exclude_statuses.indexOf(campaign.status) >=0) {
            }
            else {
              this._campaignsByCategory[category] = this._campaignsByCategory[category] || []
              this._campaignsByCategory[category].push(campaign);
            }
            break;

          default:
            this._campaignsByCategory[category] = this._campaignsByCategory[category] || []
            this._campaignsByCategory[category].push(campaign);
            break;
        }
      })
    })

    this.campaignsChanged$.next();
    this._logger.LogDebug("handleCampaignResult", this._campaignsByCategory, this._allCampaigns);
  }

  private async showCampaignView(campaign: Campaign, resetToFirstPage: boolean = false): Promise<boolean> {
    
    switch (campaign.type) {
      case "content_cta":
        await this._modalSvc.open(campaign.id, {
          component: CallToActionComponent,
          componentProps: {
            campaignId: campaign.id
          }
        });
        return true;

      case "survey":

        if (campaign.id == this._campaign_id_app_review) {
          //Cannot use apprate on web
          if (this._deviceSvc.is_Web) {
            return false;
          }

          if (campaign.state?.data?.appReview_FeedbackPrompt_id != 2) {
            await this.reviewApp(campaign.state);
            return true;
          }
        }

        await this._modalSvc.open(campaign.id, {
          component: SurveyComponent,
          componentProps: {
            campaignId: campaign.id,
            resetToFirstPage: resetToFirstPage
          }
        });
        return true;
    }

    return false;
  }

  private parseCampaign(data: any): Campaign {

    let campaign: Campaign;
    switch (data["type"]) {
      case "content_cta":
        campaign = this.parseContentCTA(data);
        break;
      case "survey":
        campaign = this.parseSurvey(data);
        break;
      case "checklist":
        campaign = this.parseChecklist(data);
        break;
      default:
        return null;
    }

    campaign.type = data["type"];
    campaign.id = data["id"];
    campaign.state = data["state"];
    campaign.status = data["status"];
    campaign.categories = data["categories"];
    campaign.display_class = data["display_class"] || [];

    if(data["preview"]){
      campaign.preview = this.parsePreview(data["preview"]);
    }


    if (data["presented_on"]) {
      campaign.presented_on = parse(data["presented_on"], "yyyy-MM-dd", new Date());
    }

    if (data["accepted_on"]) {
      campaign.accepted_on = parse(data["accepted_on"], "yyyy-MM-dd", new Date());
    }

    if (data["dismissed_on"]) {
      campaign.dismissed_on = parse(data["dismissed_on"], "yyyy-MM-dd", new Date());
    }

    if (data["postponed_until"]) {
      campaign.postponed_until = parse(data["postponed_until"], "yyyy-MM-dd", new Date());
    }
    
    const date = parse(data["window_date"], "yyyy-MM-dd", new Date());

    return campaign;
  }

  private parseCampaignAction(data: any): CampaignAction {

    const action = new CampaignAction();

    action.id = data["id"];
    action.text = data["text"];
    action.type = data["action"] || data["type"];    //For survey
    action.url = data["url"];
    action.is_default = data["is_default"];
    action.is_header = data["is_header"] || false;
    action.postpone_minutes = data["postpone_minutes"];
    action.reengage_delay_seconds = data["reengage_delay_seconds"];
    action.display_class = data["display_class"] || [];
    action.data = data["data"];


    if(data["popup"]){
      action.popup_message = this.parseCampaignPopup(data["popup"]);
    }

    return action;
  }

  private parseContentCTA(data: any): ContentCTACampaign {

    const cta = new ContentCTACampaign();

    cta.header = data["header"];
    cta.footer = data["footer"];
    cta.content_url = data["content_url"];

    this.parseActions(data, cta);

    return cta;
  }

  private parsePreview(data:any): CampaignPreview{

    const preview = new CampaignPreview();

    this.parseDescriptor(data, preview);
    this.parseActions(data, preview);

    preview.content_url = data["content_url"];
    preview.image_url_left = data["image_url_left"];
    preview.image_url_right = data["image_url_right"];
    preview.chart_top = this.parseChartOptions(data["chart_top"]);
    preview.chart_bottom = this.parseChartOptions(data["chart_bottom"]);
    return preview;
    
  }

  private parseChecklist(data: any): Checklist {

    const checklist = new Checklist();
    
    this.parseDescriptor(data, checklist);
    this.parseActions(data, checklist);

    checklist.id = data["id"];
    checklist.display_class = data["display_class"] || [];
    checklist.show_progress = data["show_progress"] || false;

    checklist.items = data.items?.filter(x=>x != null).map(s => this.parseChecklistItem(s)) || [];

    return checklist;
  }

  private parseChecklistItem(data: any): ChecklistItem{
    const item = new ChecklistItem();

    this.parseDescriptor(data, item);

    item.id = data["id"];
    item.is_enabled = data?.is_enabled != null ? data.is_enabled : true;
    item.status = data?.status || "unknown";

    if (data["action"]) {
      item.action = this.parseCampaignAction(data["action"]);
    }

    return item;
  }

  private parseCampaignPopup(data: any): CampaignPopup{
    const popup = new CampaignPopup();
    this.parseDescriptor(data, popup);

    if (data["link_actions"]) {
      popup.actions = data["link_actions"]
        .filter(x=>x != null)
        .map(a => this.parseCampaignPopupAction(a));
    } else {
      popup.actions = []
    }

    let closeAction = popup.actions.find(a=>a.is_close);

    if(!closeAction){
      closeAction = new CampaignPopupAction();
      closeAction.is_close = true;
      closeAction.text = "Close";
      closeAction.id = "default";
      popup.actions.push(closeAction);
    }
    return popup
  }

  private parseCampaignPopupAction(data: any): CampaignPopupAction{
    const action = new CampaignPopupAction();

    action.id = data["id"] || "default";
    action.is_close = data["is_close"] || false;
    action.text = data["text"];
    action.url = data["url"];
    return action;
  }

  private parseSurvey(data: any): Survey {

    const survey = new Survey();

    survey.sections = data.sections?.filter(x=>x != null).map(s => this.parseSurveySection(s)) || [];

    return survey;
  }

  private parseSurveySection(data: any): SurveySection {

    const section = new SurveySection();

    this.parseDescriptor(data, section);
    this.parseActions(data, section);

    section.id = data["id"];
    section.items = data.items?.filter(x=>x != null).map(i => this.parseSurveyItem(i)) || [];
    section.validations = this.parseSurveyValidations(data["validations"]);
    section.dependencies = this.parseSurveyDependencies(data["dependencies"]);
    section.content_url = data["content_url"];
    section.display_class = data["display_class"] || [];

    if (data["pagination"]) {
      section.hide_page_markers = data["pagination"]["hide_markers"] || false;
      section.hide_page_navigation = data["pagination"]["hide_navigation"] || false;
    }

    return section;
  }

  private parseDescriptor(data: any, item: IDescriptor) {
    item.title = data["title"] || [];
    item.description = data["description"] || [];
  }

  private parseActions(data: any, item: IActionable){
    if (data["actions"]) {
      item.actions = data["actions"]
        .filter(x=>x != null)
        .map(a => this.parseCampaignAction(a));
    } else {
      item.actions = []
    }
  }

  private parseChartOptions(data: any): ChartOptions{

    if(!data){
      return null;
    }

    const chart = new ChartOptions();
    chart.type = data["chart_type"];
    chart.data = data["chart_data"] || {},
    chart.data.labels = chart.data.labels || [""];
    chart.options = data["chart_options"];
    chart.height = data["chart_height"] || "300px";
    chart.add_ons = data["add_ons"] || {};
    chart.tooltip_options = data["tooltip_options"] || {};
    chart.legend_options = data["legend_options"] || {};

    return chart;
  }

  private parseSurveyItem(data: any): SurveyItem {

    const item = new SurveyItem();

    const x: keyof typeof SurveyItemType = data["type"];
    item.type = SurveyItemType[x];

    this.parseDescriptor(data, item);


    item.field = data["field"];
    item.level_left = data["level_left"] == null
      ? data["level"] || 0
      : data["level_left"] || 0;

    item.level_right = data["level_right"] == null
      ? data["level"] || 0
      : data["level_right"] || 0;

    item.hint = data["hint"];
    item.label = data["label"];
    item.uom_left = data["uom_left"];
    item.uom_right = data["uom_right"];
    item.value = data["value"];
    item.scale = data["scale"];
    item.options = data.options?.filter(x=>x != null).map(o => this.parseSurveyItemOption(o));
    item.dependencies = this.parseSurveyDependencies(data["dependencies"]);
    item.url = data["url"];
    item.display_class = data["display_class"] || [];

    if (item.type == SurveyItemType.action) {
      item.action = this.parseCampaignAction(data);
    }

    if (item.type == SurveyItemType.chart) {
      item.chart = this.parseChartOptions(data);
    }

    return item;
  }

  private parseSurveyItemOption(data: any): SurveyItemOption {
    const option = new SurveyItemOption();

    option.id = data["id"];
    this.parseDescriptor(data, option);
    return option;
  }

  private parseSurveyValidations(data: { [key: string]: any }): { [key: string]: SurveyValidation } {

    const validations: { [key: string]: SurveyValidation } = {};

    if (!data) {
      return validations;
    }

    Object.keys(data).forEach(field => validations[field] = this.parseSurveyValidation(data[field]));

    return validations;
  }

  private parseSurveyValidation(data: any): SurveyValidation {

    const validation = new SurveyValidation();

    validation.required = data["required"];
    validation.min_value = data["min_value"];
    validation.max_value = data["max_value"];
    validation.reg_ex = data["reg_ex"];

    return validation;
  }

  private parseSurveyDependencies(data: { [key: string]: any }): { [key: string]: SurveyDependency } {

    const dependencies: { [key: string]: Dependency } = {};

    if (!data) {
      return dependencies;
    }

    Object.keys(data).forEach(field => {
      const dep = new SurveyDependency();
      dep.include_values = data[field]["include_values"] || [];
      dep.exclude_values = data[field]["exclude_values"] || [];

      dependencies[field] = dep;
    });

    return dependencies;
  }

  private readonly _appReviewSettings: AppRatePreferences = {
    storeAppURL: {
      ios: '1486642582',
      android: "https://play.google.com/store/apps/details?id=com.rkkn.driversseatcoop2"
    },
    callbacks: {
      onButtonClicked: this.onAppReviewButtonClicked.bind(this),
      onRateDialogShow: this.onAppReviewRateDialogShow.bind(this),
      handleNegativeFeedback: this.onAppReviewHandleNegativeFeedback.bind(this),
      done: this.onAppReviewDone.bind(this)
    },
    displayAppName: this.appDisplayName,
    customLocale: {
      title: "Rate %@?",
      message: "Good ratings and reviews help attract more users, which helps us give you better information on the Insights page and more personalized recommendations.",
      cancelButtonLabel: "No, thanks",
      laterButtonLabel: "Remind Me Later",
      rateButtonLabel: "Rate Now!",


      appRatePromptTitle: "Do you like using %@?",
      appRatePromptMessage: null,

      feedbackPromptTitle: "How can we improve %@?",
      feedbackPromptMessage: "Would you be willing to tell us more about how we can improve %@ for you?",

      yesButtonLabel: "Yes",
      noButtonLabel: "No"
    },
    openUrl: (url) => window.open(url, "_system")
  };

  private _appReviewCampaignState: any;

  private setAppReviewCampaignState(key: string, value: any) {
    this._appReviewCampaignState = this._appReviewCampaignState || {};
    this._appReviewCampaignState["data"] = this._appReviewCampaignState["data"] || {};
    this._appReviewCampaignState["data"][`appReview_${key}`] = value;
  }

  public async reviewApp(state: any = {}): Promise<void> {

    this._logger.LogDebug("handleAppReviewRequest", state);

    this._appReviewCampaignState = state || {};

    this.pause(this._campaign_id_app_review); //prevent other items from popping up (must come before present)
    await this.presentCampaign(this._campaign_id_app_review, this._appReviewCampaignState);

    this._appReviewSvc.setPreferences(this._appReviewSettings);
    this._appReviewSvc.promptForRating(true);
  }

  private onAppReviewHandleNegativeFeedback() {
    this._logger.LogDebug("appReviewHandleNegativeFeedback");
  }

  private onAppReviewRateDialogShow() {
    this._logger.LogDebug("appReviewRateDialogShow");

  }

  private onAppReviewDone() {
    this._logger.LogDebug("appReviewDone");
    this._appReviewCampaignState = null;
  }

  private async onAppReviewButtonClicked(buttonIndex: number, buttonLabel: string, promptType: AppRatePromptType) {

    this._logger.LogDebug("appReviewButtonClicked", promptType, buttonIndex, buttonLabel);

    this.setAppReviewCampaignState(`${promptType}_id`, buttonIndex);
    this.setAppReviewCampaignState(`${promptType}_button`, buttonLabel);

    switch (promptType) {

      //Do you like using it?
      case AppRatePromptType.AppRatingPrompt:
        await this.handleAppReviewInitialPrompt(buttonIndex, buttonLabel, promptType);
        break;

      //Don't like, Mind giving us feedback?
      case AppRatePromptType.FeedbackPrompt:
        await this.handleAppReviewNegativeFeedbackPrompt(buttonIndex, buttonLabel, promptType);
        break;

      //Do like, Would you mind rating it?
      case AppRatePromptType.StoreRatingPrompt:
        await this.handleAppReviewStoreRatingPrompt(buttonIndex, buttonLabel, promptType);
        break;

      default:
        this.saveCampaignState(this._campaign_id_app_review, this._appReviewCampaignState);
    }
  }

  private async handleAppReviewInitialPrompt(buttonIndex: number, buttonLabel: string, promptType: AppRatePromptType) {
    this._logger.LogDebug("handleAppReviewInitialPrompt", this._appReviewCampaignState);
    await this.presentCampaign(this._campaign_id_app_review, this._appReviewCampaignState)
  }

  private async handleAppReviewNegativeFeedbackPrompt(buttonIndex: number, buttonLabel: string, promptType: AppRatePromptType) {

    this._logger.LogDebug("handleAppReviewNegativeFeedbackPrompt", this._appReviewCampaignState);

    // User does not want to provide feedback
    if (buttonIndex == 1) {

      const dismissAction = new CampaignAction();
      dismissAction.id = `${promptType}_${buttonLabel}`;
      dismissAction.type = "dismiss";
      dismissAction.reengage_delay_seconds = 0;

      await this.handleCampaignAction(this._campaign_id_app_review, dismissAction, this._appReviewCampaignState, true);
      return;
    }

    // Save results and then Navigate user to internal feedback page
    this.saveCampaignState(this._campaign_id_app_review, this._appReviewCampaignState)
      .then(() => this._navSvc.requestNavigation(true, true, true, `/marketing/survey/${this._campaign_id_app_review}`));
  }

  private async handleAppReviewStoreRatingPrompt(buttonIndex: number, buttonLabel: string, promptType: AppRatePromptType) {
    this._logger.LogDebug("handleAppReviewStoreRatingPrompt", this._appReviewCampaignState);

    const action_id = `${promptType}_${buttonLabel}`;

    //No Thanks
    if (buttonIndex == 1) {

      const dismissAction = new CampaignAction();
      dismissAction.id = action_id;
      dismissAction.type = "dismiss";
      dismissAction.reengage_delay_seconds = 0;

      await this.handleCampaignAction(this._campaign_id_app_review, dismissAction, this._appReviewCampaignState, true);
      return;
    }

    //Remind later
    if (buttonIndex == 2) {

      const remindAction = new CampaignAction();
      remindAction.id = action_id;
      remindAction.type = "postpone";
      remindAction.reengage_delay_seconds = 0;
      remindAction.postpone_minutes = 1440;

      await this.handleCampaignAction(this._campaign_id_app_review, remindAction, this._appReviewCampaignState, true);
      return;
    }

    //Review app, dismisses campaign.
    const acceptAction = new CampaignAction();
    acceptAction.type = "accept";
    acceptAction.id = action_id;
    acceptAction.reengage_delay_seconds = 0;

    await this.handleCampaignAction(this._campaign_id_app_review, acceptAction, this._appReviewCampaignState, true);
  }

}
