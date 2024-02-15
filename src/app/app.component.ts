import { Component } from '@angular/core';
import { Platform, MenuController } from '@ionic/angular';
import { Events } from './services/events.service';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Router, NavigationEnd } from '@angular/router';
import { ApiService } from './services/api.service';
import { UserService } from './services/user.service';
import { UserTrackingService } from './services/user-tracking/user-tracking.service';
import { TrackedEvent } from './models/TrackedEvent';
import { IUserSupportService } from './services/user-support/user-support.service';
import { Features } from './models/Features';
import { ILogService } from './services/logging/log.service';
import { Logger } from './services/logging/logger';
import { ReferralType } from './models/ReferralType';
import { IGigAccountManagementService } from './services/gig-account-management/gig-account-management.service';
import { IBrowserNavigationService } from './services/browser-navigation/browser-navigation.service';
import { IPreferenceService } from './services/preferences/preferences.service';
import { IMarketingService } from './services/marketing/marketing.service';
import { getUnixTime } from 'date-fns';
import { StatSummaryLevel } from './models/PerformanceStatistic';
import { TermsService } from './services/terms.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: [
    'driversseat-styles.scss',
    'app.component.scss'],
})
export class AppComponent {

  //The page the user is currently on.  Used for highlighting in the menu
  public activePage: string;

  public get canGhost(): boolean {
    return this._userSvc?.isFeatureEnabled(Features.GHOST);
  }

  private readonly _logger: Logger;

  public get appVersion(): string {
    return this._apiSvc.appVersion;
  }

  constructor(
    logSvc: ILogService,
    private readonly _platformSvc: Platform,
    private readonly _apiSvc: ApiService,
    private readonly _menuCtrl: MenuController,
    private readonly _userSvc: UserService,
    private readonly _eventsSvc: Events,
    private readonly _router: Router,
    private readonly _userSupportSvc: IUserSupportService,
    private readonly _userTrackingSvc: UserTrackingService,
    private readonly _gigAcctMgmtSvc: IGigAccountManagementService,
    private readonly _termsSvc: TermsService,

    // Don't remove unused service.  This will instantiate the 
    // service on startup and track browser navigation
    private readonly _browserNavSvc: IBrowserNavigationService,
    // Don't remove unused service.  This will instantiate the 
    // service on startup and record app version usage
    private readonly _preferenceSvc: IPreferenceService,
    // Don't remove unused service.  This will instantiate the 
    // service on startup and record app version usage
    private readonly _marketingSvc: IMarketingService) {

    this._logger = logSvc.getLogger("AppComponent");

    this._platformSvc.ready().then((readySource) => {
      // automatically navigate user to splash page
      this._router.navigateByUrl('');

      // wait on splash page and then perform the startup functions.
      // Also, this will ensure that intercom is not started up until
      // after the splash screen has been initialized.
      setTimeout(async () => {
        await this.startup();
      }, 3000);
    });
  }

  private _maintModePing;
  private pingDuringMaintenanceMode(){
    
    if (this._maintModePing){
      return;
    }

    //check every 2 minutes to see if site is up by getting public terms
    this._maintModePing = setInterval(async ()=>this._termsSvc.getPublicTerms(), 120000);
  }

  private stopPingWhenNotInMaintenanceMode(){
    
    if (!this._maintModePing){
      return;
    }

    clearInterval(this._maintModePing);
    this._maintModePing = null;
  }

  private async startup() {
    this._apiSvc.isReady$.subscribe(isReady => {
      if (!isReady) {
        return;
      }

      let isCordova = this._platformSvc.is("cordova");

      this._userTrackingSvc.initialize(isCordova);

      if (this._platformSvc.is("cordova")) {

        StatusBar.setOverlaysWebView({
          overlay: false
        });

        StatusBar.setStyle({
          style: Style.Default
        });
      }

      this._router.events.subscribe((val) => {
        if (val instanceof NavigationEnd) {
          this.activePage = val["url"].slice(1);
          console.log('router:', this.activePage)
        }
      });

      setTimeout(function () {
        SplashScreen.hide();
      }, 5000);

      // clear ghost
      this._platformSvc.pause.subscribe(async () => {
        this._userSvc.unGhost();
      });

      // Respond when the auth token is valid
      this._eventsSvc.subscribe('badAuthToken', async () => {
        this._logger.LogInfo("badAuthToken");
        this._userTrackingSvc.captureEvent(TrackedEvent.logout);
        const u = this._userSvc.currentUser;
        this._userSvc.setUser(null);
        this._browserNavSvc.navigateToStartPage(u?.email);
      });

      this._eventsSvc.subscribe('successfulLogin', async () => {

        const user = this._userSvc.currentUser;
        this._logger.LogInfo("successfulLogin", user);

        //Capture the user that logged in.  This will be used
        //to revert back to original user if ghosting occurs.
        this._userSvc.originalUser = user;
        await this._browserNavSvc.requestNavigation(false, true, true);
      });

      this._eventsSvc.subscribe("appUpdateRequired", async (model) => {

        this._logger.LogDebug("App Update Required", model);
        await this._userSupportSvc.showUpdateRequiredPopup(model);
      });

      this._eventsSvc.subscribe("maintenanceStart", async (model) => {
        this._logger.LogDebug("Maintenance Mode - Start", model);
        await Promise.all([
          await this._userSupportSvc.showMaintenanceModePopup(model),
          this._userSvc.setUser(null),
          this._apiSvc.removeAuthToken()
        ])

        this._logger.LogDebug("maintenanceStart", this._userSvc.currentUser$.value);
        this.pingDuringMaintenanceMode();
      });

      this._eventsSvc.subscribe("maintenanceEnd", async () => {
        this._logger.LogDebug("Maintenance Mode - End");
        this.stopPingWhenNotInMaintenanceMode();
        await Promise.all([
          this._userSupportSvc.hideMaintenanceModePopup(),
          this._userSvc.setUser(null),
          this._apiSvc.removeAuthToken()
        ]);
      });

      //If the back-end identifies invalid terms of usage
      //redirect user to terms page
      this._eventsSvc.subscribe('termsOutOfDate', () => {
        this._logger.LogInfo("termsOutOfDate");
        this._browserNavSvc.navigateToTermsOfService();
      });

      this._apiSvc.isReady$.subscribe(async ready => {
        if (!ready) {
          return;
        }

        await this._browserNavSvc.requestNavigation(true, true, true);

      })

      // Set your iOS Settings
      var iosSettings = {};
      iosSettings["kOSSettingsKeyAutoPrompt"] = false;
      iosSettings["kOSSettingsKeyInAppLaunchURL"] = false;
    });
  }

  public get countGigAccountIssues(): number {
    return this._gigAcctMgmtSvc.countGigAccountIssues;
  }

  public async clickHelp() {

    if (this._apiSvc.isGhosting) {
      alert("Unable to use help while ghosting");
      return;
    }

    await this._userSupportSvc.openMessenger();
    await this.closeMenu()
  }

  public async closeMenu() {
    await this._menuCtrl.close('shiftOnRightMenuContentId');
  }

  public async clickDashboard() {
    await Promise.all([
      this._browserNavSvc.requestNavigation(false, false, false, "home"),
      this.closeMenu()
    ]);
  }

  public async clickEarningsExpenses() {
    const startUnix = getUnixTime(new Date());
    await Promise.all([
      this._browserNavSvc.requestNavigation(false, false, false, `/expenses/list?start=${startUnix}&level=${StatSummaryLevel.year}`),
      this.closeMenu()
    ]);
  }

  public async clickResearch() {
    await Promise.all([
      this._browserNavSvc.requestNavigation(false, false, false, "research"),
      this.closeMenu()
    ]);
  }

  public async clickGigAccounts() {
    await Promise.all([
      this._browserNavSvc.requestNavigation(false, false, false, "gig-accounts"),
      this.closeMenu()
    ]);
  }

  public async clickProfile() {
    await Promise.all([
      this._browserNavSvc.requestNavigation(false, false, false, "profile"),
      this.closeMenu()
    ]);
  }

  public async clickGhost() {
    await Promise.all([
      this._browserNavSvc.requestNavigation(false, false, false, "help"),
      this.closeMenu()
    ]);
  }

  public async clickReferral() {
    await Promise.all([
      this._browserNavSvc.requestNavigation(false, false, false, `marketing/referral/generate/${ReferralType.FromMenu}`),
      this.closeMenu()
    ]);
  }

  public async clickTermsOfUse() {
    await Promise.all([

      this._termsSvc.showPublicTerms(),
      this.closeMenu()
    ]);
  }

  public async clickWorkSettings() {
    await Promise.all([
      this._browserNavSvc.requestNavigation(false, false, false, "work-settings"),
      this.closeMenu()
    ]);
  }

  public async clickGoals() {
    await Promise.all([
      this._browserNavSvc.requestNavigation(false, false, false, "goals"),
      this.closeMenu()
    ]);
  }

  public async clickLogout() {

    await this._userTrackingSvc.captureEvent(TrackedEvent.logout);
    await this._userSvc.setUser(null)
      .then(async () => {
        await this._apiSvc.removeAuthToken()
        //no need to reroute, app component will do this
        await this.closeMenu();
      });
  }
}
