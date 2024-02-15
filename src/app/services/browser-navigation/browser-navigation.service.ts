import { Location } from '@angular/common';
import { Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { ILogService } from '../logging/log.service';
import { Logger } from '../logging/logger';
import { SessionService } from '../session.service';
import { ApiService } from '../api.service';
import { User } from 'src/app/models/User';
import { UserService } from '../user.service';
import { TermsService } from '../terms.service';

export abstract class IBrowserNavigationService {
  public abstract navigateBack(): Promise<void>;
  public abstract requestNavigation(validateSession: boolean, validateTerms: boolean, validateProfileComplete: boolean, toUrl?: string): Promise<void>
  public abstract navigateToStartPage(email?: string): Promise<void>;
  public abstract navigateToTermsOfService(): Promise<void>
}

@Injectable({
  providedIn: 'root'
})
export class BrowserNavigationService implements IBrowserNavigationService {

  private readonly _logger: Logger;

  //Represents a pending request to navigate somewhere.
  //The request may be interrupted b/c of a more pressing issue (like invalid session, profile, or terms)
  private _requestedUrl: string = null;

  private _currentUrl: string = null;

  constructor(
    logSvc: ILogService,
    private readonly _router: Router,
    private readonly _location: Location,
    private readonly _sessionSvc: SessionService,
    private readonly _apiSvc: ApiService,
    private readonly _userSvc: UserService,
    private readonly _termsSvc: TermsService
  ) {
    this._logger = logSvc.getLogger("BrowserNavigationService");
    
    this._router.events.subscribe(event => {

      if (event instanceof NavigationEnd) {
        const navEndEvent = event as NavigationEnd;
        this._currentUrl = navEndEvent.urlAfterRedirects;

        if(this._currentUrl.startsWith('/')){
          this._currentUrl = this._currentUrl.substring(1);
        }

        this._logger.LogDebug("NavigationEnd", event.urlAfterRedirects);
      }
    });
  }

  public async navigateBack(): Promise<void> {
    this._logger.LogDebug("navigateBack");
    this._location.historyGo(-1);
  }

  public async requestNavigation(validateSession: boolean, validateTerms: boolean, validateProfileComplete: boolean, toUrl: string = null) {

    this._logger.LogDebug("requestNavigation", validateSession, validateTerms, validateProfileComplete, toUrl)

    if (toUrl && toUrl == this._currentUrl) {
      this._logger.LogDebug("requestNavigation", "cancelled, already there");
      return;
    }

    if (validateSession && !await this.validateSession()) {
      this._logger.LogInfo("Invalid Session");
      this._requestedUrl = toUrl || this._requestedUrl;
      await this.navigateToStartPage();
      return;
    }

    if (validateTerms && !await this.validateTermsOfUseAccepted()) {
      this._logger.LogInfo("Invalid Terms of Use");
      this._requestedUrl = toUrl || this._requestedUrl;
      await this.navigateTo("onboarding/terms");
      return;
    }

    if (validateProfileComplete && !this.validateProfileComplete(this._userSvc.currentUser)) {
      this._logger.LogInfo("Profile Incomplete", this._userSvc.currentUser);
      this._requestedUrl = toUrl || this._requestedUrl;
      await this.navigateTo("onboarding/profile");
      return;
    }

    toUrl = toUrl || this._requestedUrl;
    this._requestedUrl = null;

    await this.navigateTo(toUrl || "home");
  }

  private async validateSession(): Promise<boolean> {

    const authToken = await this._apiSvc.getAuthToken();

    //Check for an existing session
    if (!authToken) {
      return false;
    }

    let user: User;
    try {
      user = await this._sessionSvc.getSession()
      this._logger.LogDebug("getSession", user);
      if (!user) {
        return false;
      }
      //TODO:  this shouldn't happen here.  Ensures that ghosting works for existing sessions
      this._userSvc.originalUser = user;
    } catch (ex) {
      this._logger.LogWarning("getSession Exception", ex);
      return false;
    }

    return true;
  }

  private async validateTermsOfUseAccepted(): Promise<boolean> {

    // Ensure that the user has filled out the current TOS
    try {
      return await this._termsSvc.isCurrentTermsAccepted()
    } catch (ex) {
      this._logger.LogError(ex, "validateTermsOfUseAccepted");
      return false;
    }
  }

  private validateProfileComplete(user: User): boolean {
    return user?.isRequiredProfileComplete || false;
  }

  public async navigateToStartPage(email: string = null): Promise<void> {
    const startPage = await this._apiSvc.get("startPage") || "onboarding";
    const url = (email != null && email != "")
      ? `${startPage}?email=${email}`
      : startPage;
    await this.navigateTo(url);
  }

  public async navigateToTermsOfService(): Promise<void> {
    await this.navigateTo("onboarding/terms");
  }

  private async navigateTo(url: string): Promise<void> {

    if(this._currentUrl?.toLocaleLowerCase() == url?.toLocaleLowerCase()) {
      this._logger.LogDebug("navigateTo", url, "skipped, already there");
      return;
    }
    
    this._logger.LogDebug("navigateTo", url, "from", this._currentUrl);
    this._router.navigateByUrl(url);
  }
}