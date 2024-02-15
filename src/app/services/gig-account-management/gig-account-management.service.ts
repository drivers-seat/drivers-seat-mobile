import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ArgyleGigAccount, ArgyleUser } from 'src/app/models/Argyle';
import { User } from 'src/app/models/User';
import { environment } from 'src/environments/environment';
import { ApiService } from '../api.service';
import { IDeviceService } from '../device/device.service';
import { ILogService } from '../logging/log.service';
import { Logger } from '../logging/logger';
import { UserService } from '../user.service';
import * as $ from 'jquery'
import { UserTrackingService } from '../user-tracking/user-tracking.service';
import { TrackedEvent } from 'src/app/models/TrackedEvent';


export abstract class IGigAccountManagementService {
  public abstract isReady$: BehaviorSubject<boolean>;
  public abstract linkedAccounts$: BehaviorSubject<ArgyleGigAccount[]>;
  public abstract isRegistered$: BehaviorSubject<boolean>;
  public abstract deleteGigAccountLink(account: ArgyleGigAccount): Promise<void>;
  public abstract disconnectProvider(): Promise<void>;
  public abstract manageGigAccountLinks(account?: ArgyleGigAccount): Promise<void>;
  public abstract get countGigAccountIssues(): number;
  public abstract get gigAccountsWithIssues(): Array<ArgyleGigAccount>;
}

declare var Argyle;

@Injectable({
  providedIn: 'root'
})
export class GigAccountManagementService implements IGigAccountManagementService {

  private readonly _logger: Logger;
  private readonly _argyleUrl: string = environment.argyle?.url;
  private readonly _argyleKey: string = environment.argyle?.key;
  private readonly _argyleCustomizationId: string = environment.argyle["customizationId"] || "00000000";
  public get appDisplayName(): string { return environment.appDisplayName; }

  public isReady$: BehaviorSubject<boolean> = new BehaviorSubject(false);
  public linkedAccounts$: BehaviorSubject<ArgyleGigAccount[]> = new BehaviorSubject(null);
  public isRegistered$: BehaviorSubject<boolean> = new BehaviorSubject(null);

  public get gigAccountsWithIssues(): Array<ArgyleGigAccount> {
    return this.linkedAccounts$.value?.filter(x => x.has_errors) || [];
  }

  public get countGigAccountIssues(): number {
    return this.gigAccountsWithIssues.length;
  }

  public get isArgyleConfigured(): boolean {
    return this._argyleKey != null && this._argyleUrl != null;
  }

  private _currentUser: User;
  private _argyleUser: ArgyleUser;
  private _updateInterval: any;
  private readonly _updateIntervalMs: number = 60000;

  constructor(
    logSvc: ILogService,
    private readonly _userSvc: UserService,
    private readonly _apiSvc: ApiService,
    private readonly _httpClient: HttpClient,
    private readonly _deviceSvc: IDeviceService,
    private readonly _userTrackingSvc: UserTrackingService
  ) {
    this._logger = logSvc.getLogger("GigAccountManagementService");

    this._userSvc.currentUser$.subscribe(user => {
      this.onUserChanged(user)
    });
  }

  private onUserChanged(user: User) {
    const oldUser = this._currentUser;
    this._currentUser = user;

    if (this._currentUser?.id == oldUser?.id) {
      return;
    }

    if (this.isArgyleConfigured) {

      this.refreshLinkedAccountInfoFromArgyle(false);

      //Set up autorefresh
      if (this._currentUser && !this._updateInterval) {
        this._updateInterval = setInterval(this.refreshLinkedAccountInfoFromArgyle.bind(this), this._updateIntervalMs);
      }
      return;
    }

    if (!this._updateInterval) {
      return;
    }

    const interval = this._updateInterval;
    this._updateInterval = null;
    clearInterval(interval);
  }

  public async deleteGigAccountLink(gigAccount: ArgyleGigAccount): Promise<void> {

    //If no current API user, exit
    if (!this._apiSvc.isGhosting) {
      this._logger.LogInfo("deleteGigAccountLink", "Ignoring Request while ghosting");
      return
    }

    //If argyle not configured
    if (!this.isArgyleConfigured) {
      this._logger.LogInfo("deleteGigAccountLink", "Ignoring Request Argyle not configured");
      return
    }

    //If no current API user, exit
    if (!this._currentUser) {
      this._logger.LogDebug("deleteGigAccountLink", "Ignoring Request, no API User Available");
      return
    }

    this._logger.LogInfo("deleteGigAccountLink", gigAccount);

    this.setIsReadyStatus(false);

    //get the current Argyle user id
    const argyleUser = await this.getArgyleUser();

    //Make sure that we have a token. If not, send user to manage account links as a failsafe
    if (!argyleUser?.user_token) {
      this._logger.LogWarning("deleteGigAccountLink", "Unexpected missing token", argyleUser, gigAccount)
      this.setIsReadyStatus(true);
      await this.manageGigAccountLinks();
      return;
    }

    const url = `${this._argyleUrl}/accounts/${gigAccount.id}`;
    const options = GigAccountManagementService.getArgyleHttpRequestOptions(argyleUser);
    try {
      await this._httpClient.delete(url, options).toPromise();

      //if we queried Argyle right now, the deleted account would still be on the list
      //To work around this, temporariy delete the item from the list based on its id
      //Set a timeout (further down) to refresh the list of accounts from the server.
      this.linkedAccounts$.next(this.linkedAccounts$.value?.filter(x => x.id != gigAccount.id));

    } catch (ex) {
      this._logger.LogError(ex, "deleteGigAccountLink", gigAccount);
    }

    setTimeout(async () => {
      await this.refreshLinkedAccountInfoFromArgyle();
      this.setIsReadyStatus(true);
    }, 5000);
  }

  public async disconnectProvider(): Promise<void> {

    //If no current API user, exit
    if (!this._apiSvc.isGhosting) {
      this._logger.LogInfo("disconnectProvider", "Ignoring Request while ghosting");
      return
    }

    //If argyle not configured
    if (!this.isArgyleConfigured) {
      this._logger.LogInfo("disconnectProvider", "Ignoring Request Argyle not configured");
      return
    }

    //If no current API user, exit
    if (!this._currentUser) {
      this._logger.LogDebug("disconnectProvider", "Ignoring Request, no API User Available");
      return
    }

    this._logger.LogInfo("disconnectProvider", this._currentUser);

    this.setIsReadyStatus(false);

    try {
      await this._httpClient.delete(`${this._apiSvc.url()}/argyle_user/${this._currentUser.id}`).toPromise();
    } catch (ex) {
      this._logger.LogError(ex, "disconnectProvider", this._currentUser, this._argyleUser);
    }

    await this.refreshLinkedAccountInfoFromArgyle();

    this.setIsReadyStatus(true);
  }

  private setIsReadyStatus(isReady: boolean) {

    if (this.isReady$.value == isReady) {
      return;
    }

    this.isReady$.next(isReady);
  }

  private hasAccountChanges(argyleUser: ArgyleUser, linkedAccounts: Array<ArgyleGigAccount>): boolean {

    const newValMap = {};
    linkedAccounts?.forEach(x => newValMap[x.link_item] = x.id);
    const newValKeys = Object.keys(newValMap).sort();
    const newSvcNames = linkedAccounts?.filter(x => x.is_connected)?.map(x => x.link_item)?.sort() || [];

    const existValMap = argyleUser?.accounts || {};
    const existValKeys = Object.keys(existValMap).sort();
    const existSvcNames = argyleUser?.service_names?.sort();

    if (newValKeys.length != existValKeys.length) {
      return true;
    }

    const newVal = {};
    newValKeys.forEach(k => newVal[k] = newValMap[k]);
    const newValJson = JSON.stringify(newVal);
    const newSvcNamesJson = JSON.stringify(newSvcNames);

    const existVal = {};
    existValKeys.forEach(k => existVal[k] = existValMap[k]);
    const existValJson = JSON.stringify(existVal);
    const existSvcNamesJson = JSON.stringify(existSvcNames);

    return (newValJson != existValJson) || (newSvcNamesJson != existSvcNamesJson);
  }

  private async refreshLinkedAccountInfoFromArgyle(useCachedArgyleUserInfo: boolean = true) {

    //If no current API user, exit
    if (!this._currentUser || !this.isArgyleConfigured) {
      this._logger.LogDebug("refreshLinkedAccountInfoFromArgyle", "Ignoring Request, no API User Available or Argyle not configured");
      await this.handleArgyleUserResult(null);
      await this.saveLinkedAccountChanges([]);
      return;
    }

    this.setIsReadyStatus(false);

    //get the current Argyle user id
    const argyleUser = await this.getArgyleUser(useCachedArgyleUserInfo);

    if (!argyleUser?.user_token) {
      await this.saveLinkedAccountChanges([]);
      return;
    }

    //Get current accounts from argyle
    try {
      const gigAccts = await this.getLinkedGigAccounts();
      await this.saveLinkedAccountChanges(gigAccts);

    } catch (ex) {
      this._logger.LogError(ex, "refreshLinkedAccountInfoFromArgyle", "getArgyleAccounts", this._argyleUser);
    }
  }

  private async saveLinkedAccountChanges(linkedAccounts: Array<ArgyleGigAccount>) {
    this.linkedAccounts$.next(linkedAccounts);

    //If no current API user, exit
    if (!this._apiSvc.isGhosting) {
      this._logger.LogInfo("saveLinkedAccountChanges", "Ignoring Request while ghosting");
      this.setIsReadyStatus(true);
      return
    }

    //If argyle not configured
    if (!this.isArgyleConfigured) {
      this._logger.LogInfo("saveLinkedAccountChanges", "Ignoring Request Argyle not configured");
      this.setIsReadyStatus(true);
      return
    }

    //If no current API user, exit
    if (!this._currentUser) {
      this._logger.LogDebug("saveLinkedAccountChanges", "Ignoring Request, no API User Available");
      this.setIsReadyStatus(true);
      return
    }

    if (this.hasAccountChanges(this._argyleUser, linkedAccounts) && this._argyleUser.argyle_id) {
      await this.updateArgyleUser(this._argyleUser.user_id, this._argyleUser.argyle_id, this._argyleUser.user_token, linkedAccounts);
    }

    this.setIsReadyStatus(true);
  }

  // Gets the argyle user information from the API Database
  private async getArgyleUser(useCachedArgyleUserInfo: boolean = true): Promise<ArgyleUser> {

    if (this._argyleUser && useCachedArgyleUserInfo) {
      return this._argyleUser;
    }

    if (!this._currentUser) {
      this._logger.LogInfo("getArgyleUser", "skipping because no current user");
      this.isRegistered$.next(false);
      return null;
    }

    this._logger.LogDebug("getArgyleUser", this._currentUser.id);

    const data = await this._httpClient.get(`${this._apiSvc.url()}/argyle_user/${this._currentUser.id}`).toPromise();
    this.handleArgyleUserResult(data);

    return this._argyleUser;
  }

  private handleArgyleUserResult(data: any) {

    this._logger.LogDebug("handleArgyleUserResult", data);

    if (!data || !data["data"]) {
      this._argyleUser = null;
    } else {
      const argyleUser = ArgyleUser.parseArgyleUser(data["data"]);
      this._logger.LogDebug("handleArgyleUserResult", argyleUser);
      this._argyleUser = argyleUser;
    }

    this.isRegistered$.next(this._argyleUser?.user_token != null && this._argyleUser?.argyle_id != null);
  }

  // Save Argyle User Information to the API Database
  private async createNewArgyleUser(userId: number, argyleUserId: string, argyleToken: string) {

    //If no current API user, exit
    if (!this._currentUser) {
      this._logger.LogDebug("createNewArgyleUser", "Ignoring Request, no API User Available");
      return;
    }

    if (this._apiSvc.isGhosting) {
      this._logger.LogDebug("createNewArgyleUser", "Ignoring Request, ghosting");
      return;
    }

    if (!this.isArgyleConfigured) {
      this._logger.LogDebug("createNewArgyleUser", "Ignoring, Argyle not configured");
      return;
    }

    const postData = {
      argyle_user: {
        argyle_id: argyleUserId,
        user_id: this._currentUser.id,
        user_token: argyleToken,
      }
    }

    this._logger.LogDebug("createNewArgyleUser", postData);

    const data = await this._httpClient.post(`${this._apiSvc.url()}/argyle_user`, postData).toPromise();
    this._logger.LogDebug("createNewArgyleUser", data);
    this.handleArgyleUserResult(data);
  }

  private async updateArgyleUser(userId: number, argyleUserId: string, argyleToken: string, linkedAccounts: Array<ArgyleGigAccount>) {

    //If no current API user, exit
    if (!this._currentUser) {
      this._logger.LogDebug("updateArgyleUser", "Ignoring Request, no API User Available");
      return;
    }

    if (this._apiSvc.isGhosting) {
      this._logger.LogDebug("updateArgyleUser", "Ignoring Request, ghosting");
      return;
    }

    if (!this.isArgyleConfigured) {
      this._logger.LogDebug("updateArgyleUser", "Ignoring, Argyle not configured");
      return;
    }

    this._logger.LogDebug("updateArgyleUser", userId, argyleUserId, argyleToken, linkedAccounts);

    const accounts = {};
    linkedAccounts.forEach(x => accounts[x.link_item] = x.id);

    const services = linkedAccounts.filter(x => x.is_connected).map(x => x.link_item);

    const postData = {
      argyle_user: {
        argyle_id: argyleUserId,
        user_token: argyleToken,
        user_id: userId,
        accounts: accounts,
        service_names: services
      }
    }

    const data = await this._httpClient.put(`${this._apiSvc.url()}/argyle_user/${userId}`, postData).toPromise();
    this.handleArgyleUserResult(data);

    this._userTrackingSvc.captureEvent(TrackedEvent.gig_account_services_changed, {
      active_services: services?.join(", "),
      all_services: linkedAccounts?.map(x => x.link_item)?.join(", ")
    });
  }

  // Adds Argyle Authentication information to an Http reuqest
  private static getArgyleHttpRequestOptions(argyleUser: ArgyleUser): any {

    if (argyleUser) {
      return {
        headers: {
          'Authorization': `Bearer ${argyleUser.user_token}`
        }
      };
    }

    return null;
  }

  private async getLinkedGigAccounts(): Promise<Array<ArgyleGigAccount>> {

    const argyleUser = await this.getArgyleUser();

    if (!argyleUser?.argyle_id || !argyleUser.user_token) {
      this._logger.LogInfo("getArgyleAccounts", "invalid Argyle User Info", argyleUser);
      return [];
    }

    const url = `${this._argyleUrl}/accounts?user=${argyleUser.argyle_id}&limit=200`;

    const argyleAccounts = await this.getLinkedGigAccountsImpl(url, argyleUser);

    this._logger.LogDebug("getArgyleAccounts", this._argyleUser, argyleAccounts);

    return argyleAccounts;
  }

  private async getLinkedGigAccountsImpl(url: string, argyleUser: ArgyleUser): Promise<Array<ArgyleGigAccount>> {

    this._logger.LogDebug("getArgyleAccountsImpl", url, argyleUser);

    const requestOptions = GigAccountManagementService.getArgyleHttpRequestOptions(argyleUser);
    const data = await this._httpClient.get(url, requestOptions).toPromise();

    if (!data) {
      this._logger.LogDebug("getArgyleAccountsImpl", "no data");
      return [];
    }

    //If there's a next page, fire off the request for its data while we parse the
    //existing page of data
    const nextPagePromise = data["next"]
      ? this.getLinkedGigAccountsImpl(data["next"], argyleUser)
      : null;

    //parse the existing page of data
    const argyleAccounts = data["results"]
      ? data["results"]
        .map(x => this.parseArgyleLinkedGigAccount(x))
      : [];

    //Add next page of data if waiting on it
    if (nextPagePromise) {
      argyleAccounts.push(... await nextPagePromise);
    }

    return argyleAccounts;
  }

  private parseArgyleLinkedGigAccount(argyleInfo: any): ArgyleGigAccount {

    const argyleAccount = new ArgyleGigAccount();

    argyleAccount.id = argyleInfo.id;
    argyleAccount.link_item = argyleInfo["source"]
    argyleAccount.data_partner = argyleInfo["source"]

    if (argyleInfo["availability"] && argyleInfo["availability"]["gigs"]) {

      const activityInfo = argyleInfo["availability"]["gigs"];

      argyleAccount.is_synced = activityInfo.status == 'synced';
      argyleAccount.activity_status = activityInfo.status;
      argyleAccount.activity_count = activityInfo.available_count;

      if (activityInfo.updated_at) {
        argyleAccount.activities_updated_at = new Date(activityInfo.updated_at);
      }

      if (activityInfo.available_from) {
        argyleAccount.activity_date_min = new Date(activityInfo.available_from);
      }

      if (activityInfo.available_to) {
        argyleAccount.activity_date_max = new Date(activityInfo.available_to);
      }
    }

    if (argyleInfo["connection"]) {
      const connectionInfo = argyleInfo["connection"];
      argyleAccount.is_connected = connectionInfo.status == 'connected';
      argyleAccount.has_errors = (connectionInfo.error_code && connectionInfo.error_code != "") || (connectionInfo.error_message && connectionInfo.error_message != "");
      argyleAccount.connection_status = connectionInfo.status;
      argyleAccount.connection_error_code = connectionInfo.error_code;
      argyleAccount.connection_error_message = connectionInfo.error_message;

      if (connectionInfo.updated_at) {
        argyleAccount.connection_updated_at = new Date(connectionInfo.updated_at);
      }
    }

    return argyleAccount;
  }

  private async processArgyleChange() {
    //sometimes Argyle is slow to report
    setTimeout(async () => {
      await this.refreshLinkedAccountInfoFromArgyle();
    }, 500);
  }

  public async manageGigAccountLinks(account?: ArgyleGigAccount): Promise<void> {

    if (this._apiSvc.isGhosting) {
      this._logger.LogWarning("manageAccountLinks", "Ignoring request while ghosting");
      return;
    }

    if (!this._currentUser) {
      this._logger.LogWarning("manageAccountLinks", "Ignoring request while no active user");
      return;
    }

    if (!this.isArgyleConfigured) {
      this._logger.LogWarning("manageAccountLinks", "Ignoring request Argyle not configured");
      return;
    }

    if (!this._argyleKey) {
      this._logger.LogWarning("manageAccountLinks", "skipping - invalid credentials", this._currentUser, this._argyleKey, this._argyleUrl);
      return;
    }

    this._logger.LogInfo("manageGigAccountLinks", account);

    //Get the latest info from the server
    let argyleUser = await this.getArgyleUser(false);

    let uiEventInterval;

    const argyle = Argyle.create({
      linkKey: this._argyleKey,
      sandbox: false,
      userToken: argyleUser?.user_token,
      flowId: this._argyleCustomizationId,
      accountId: account?.id,
      companyName: this.appDisplayName,
      onUserCreated: async ({ userToken, userId }) => {
        this._logger.LogInfo("onUserCreated", "userId", userId, "token", userToken);
        await this.createNewArgyleUser(this._currentUser.id, userId, userToken);
      },
      onAccountCreated: async ({ accountId, userId, linkItemId }) => {
        this._logger.LogInfo("Argyle Link Event", "onAccountCreated", userId, accountId, linkItemId);
        await this.processArgyleChange();
      },
      onAccountUpdated: async ({ accountId, userId, linkItemId }) => {
        this._logger.LogInfo("Argyle Link Event", "onAccountUpdated", userId, accountId, linkItemId);
        await this.processArgyleChange();
      },
      onAccountConnected: async ({ accountId, userId, linkItemId }) => {
        this._logger.LogInfo("Argyle Link Event", "onAccountConnected", userId, accountId, linkItemId);
        await this.processArgyleChange();
        await this._userTrackingSvc.captureEvent(TrackedEvent.gig_account_linked)
      },
      onAccountRemoved: async ({ accountId, userId, linkItemId }) => {
        this._logger.LogInfo("Argyle Link Event", "onAccountRemoved", userId, accountId, linkItemId);
        await this.processArgyleChange();
        await this._userTrackingSvc.captureEvent(TrackedEvent.gig_account_remove)
      },
      onAccountError: async ({ accountId, userId, linkItemId }) => {
        this._logger.LogInfo("Argyle Link Event", "onAccountError", userId, accountId, linkItemId);
        await this.processArgyleChange();
        await this._userTrackingSvc.captureEvent(TrackedEvent.gig_account_link_problem)
      },
      onClose: async () => {
        this._logger.LogInfo("Argyle Link Event", "onClose");
        await this.processArgyleChange();
        if (uiEventInterval) {
          clearInterval(uiEventInterval);
          uiEventInterval = null;
        }
      },
      onUIEvent: (event) => {
        this._logger.LogDebug("Argyle Link Event", "onUIEvent", event);

        // The Argyle link pane exists outside of our angular
        // application. If we are on ios, find the Argyle header and add
        // some margin to the top to accomodate the iOS status bar.
        // if (event.name.indexOf('opened') !== -1 && this._deviceSvc.is_iOS) {
        if (this._deviceSvc.is_iOS) {

          $("[data-hook='close-button']").css("margin-top", "50px");
          $("[data-hook='back-button']").css("margin-top", "50px");

          if (!uiEventInterval) {
            uiEventInterval = setInterval(() => {
              console.log("Argyle UI Interval");
              $("[data-hook='close-button']").css("margin-top", "50px");
              $("[data-hook='back-button']").css("margin-top", "50px");
            }, 3000);
          }
        }
      },
    })

    argyle.open();
  }
}
