import { NgModule } from '@angular/core';
import { RouteReuseStrategy } from '@angular/router';
import { HttpClientModule, HttpUrlEncodingCodec } from '@angular/common/http';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { SQLite } from '@ionic-native/sqlite/ngx';
import { AndroidPermissions } from '@awesome-cordova-plugins/android-permissions/ngx';
import { ScreenOrientation } from '@awesome-cordova-plugins/screen-orientation/ngx';
import { SwiperModule } from 'swiper/angular';
import { IonicStorageModule } from '@ionic/storage-angular';
import { SafeHtmlPipe } from './pipes/safe-html-pipe';
import { Mixpanel, MixpanelPeople } from '@awesome-cordova-plugins/mixpanel/ngx';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { APIHttpInterceptor } from './services/interceptor';
import * as Sentry from "@sentry/capacitor";
import * as SentryAngular from "@sentry/angular";

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { UserTrackingService } from './services/user-tracking/user-tracking.service';
import { MixpanelUserTrackingProvider } from './services/user-tracking/MixpanelUserTrackingProvider';
import { InAppBrowser } from '@awesome-cordova-plugins/in-app-browser/ngx'; 
import { ILogService, LogService } from "./services/logging/log.service";
import { ILocationTrackingService, LocationTrackingService } from './services/location-tracking/location-tracking.service';
import { DeviceService, IDeviceService } from './services/device/device.service';
import { IWorkScheduleService, WorkScheduleService } from './services/work-schedule/work-schedule.service';
import { ExternalContentService, IExternalContentService } from './services/external-content/external-content.service';
import { OneSignalUserTrackingProvider } from './services/user-tracking/OneSignalUserTrackingProvider';
import { IUserSupportService, UserSupportService } from './services/user-support/user-support.service';
import { GigPlatformService, IGigPlatformService } from './services/gig-platform/gig-platform.service';
import { IReferralService, ReferralService } from './services/referral/referral.service';
import { SMS } from '@awesome-cordova-plugins/sms/ngx';
import { IPreferenceService, PreferencesService } from './services/preferences/preferences.service';
import { ILookupDataService, LookupDataService } from './services/lookup-data/lookup-data.service';
import { AnalyticsService, IAnalyticsService } from './services/analytics/analytics.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BrowserModule } from '@angular/platform-browser';
import { GigAccountManagementService, IGigAccountManagementService } from './services/gig-account-management/gig-account-management.service';
import { IBrowserNavigationService, BrowserNavigationService } from './services/browser-navigation/browser-navigation.service';
import { EarningsService, IEarningsService } from './services/earnings/earnings.service';
import { IMarketingService, MarketingService } from './services/marketing/marketing.service';
import { ExpensesService, IExpenseService } from './services/expenses.service';
import { GoalTrackingService, IGoalTrackingService } from './services/goal-tracking/goal-tracking.service';
import { IModalService, ModalService } from './services/modal/modal.service';
import { AppRate } from '@awesome-cordova-plugins/app-rate/ngx';
import { environment } from 'src/environments/environment';
import { HelpModule } from './components/help/help.module';

if(environment.sentry?.dsn){
  Sentry.init(
    {
      dsn: environment.sentry.dsn,
      release: `dsc@${environment.versionId}`,
      dist: environment.buildId
    },
    SentryAngular.init
  );
}

@NgModule({
  declarations: [
    AppComponent,
    SafeHtmlPipe
  ],
  entryComponents: [],
  imports: [
    CommonModule,
    BrowserModule,
    IonicModule.forRoot(),
    FormsModule,
    AppRoutingModule,
    HttpClientModule,
    SwiperModule,
    IonicStorageModule.forRoot(),
    HelpModule
  ],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    SQLite, AndroidPermissions, ScreenOrientation,
    Mixpanel, MixpanelPeople, UserTrackingService, MixpanelUserTrackingProvider, 
    OneSignalUserTrackingProvider, HttpUrlEncodingCodec, SMS, AppRate, InAppBrowser,
    {
      provide: IBrowserNavigationService,
      useClass: BrowserNavigationService
    },
    {
      provide: IGigPlatformService,
      useClass: GigPlatformService
    },
    {
      provide: ILogService,
      useClass: LogService
    },
    {
      provide: ILocationTrackingService,
      useClass: LocationTrackingService
    },
    {
      provide: IDeviceService,
      useClass: DeviceService
    },
    {
      provide: IWorkScheduleService,
      useClass: WorkScheduleService
    },
    {
      provide: IExternalContentService,
      useClass: ExternalContentService
    },
    {
      provide: IUserSupportService,
      useClass: UserSupportService
    },
    {
      provide: IReferralService,
      useClass: ReferralService
    },
    {
      provide: IAnalyticsService,
      useClass: AnalyticsService
    },
    {
      provide: IPreferenceService,
      useClass: PreferencesService
    },
    {
      provide: ILookupDataService,
      useClass: LookupDataService
    },
    {
      provide: IGigAccountManagementService,
      useClass: GigAccountManagementService
    },
    {
      provide: IEarningsService,
      useClass: EarningsService
    },
    {
      provide: IMarketingService,
      useClass: MarketingService
    },
    {
      provide: IExpenseService,
      useClass: ExpensesService
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: APIHttpInterceptor,
      multi: true
    },
    {
      provide: IGoalTrackingService,
      useClass: GoalTrackingService
    },
    {
      provide: IModalService,
      useClass: ModalService
    }
  ],
  bootstrap: [AppComponent],
})
export class AppModule { }
