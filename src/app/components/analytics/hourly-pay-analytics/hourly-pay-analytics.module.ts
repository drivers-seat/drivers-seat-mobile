import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HourlyPayAnalyticsSettingsComponent } from './hourly-pay-analytics-settings/hourly-pay-analytics-settings.component';
import { HourlyPayAnalyticsHeatmapComponent } from './hourly-pay-analytics-heatmap/hourly-pay-analytics-heatmap.component';
import { HourlyPayAnalyticsComponent } from './hourly-pay-analytics/hourly-pay-analytics.component';
import { IonicSelectableModule } from 'ionic-selectable';
import { FormsModule } from '@angular/forms';
import { HourlyPayAnalyticsTrendComponent } from './hourly-pay-analytics-trend/hourly-pay-analytics-trend.component';
import { HourlyPayAnalyticsTrendEmployerListComponent } from './hourly-pay-analytics-trend-employer-list/hourly-pay-analytics-trend-employer-list.component';
import { HourlyPayAnalyticsFooterMakeBetterComponent } from './hourly-pay-analytics-footer-make-better/hourly-pay-analytics-footer-make-better.component';
import { HourlyPayAnalyticsMissingDataComponent } from './hourly-pay-analytics-missing-data/hourly-pay-analytics-missing-data.component';
import { HourlyPayAnalyticsWelcomeComponent } from './hourly-pay-analytics-welcome/hourly-pay-analytics-welcome.component';
import { HourlyPayAnalyticsMetroNotEnoughDataComponent } from './hourly-pay-analytics-metro-not-enough-data/hourly-pay-analytics-metro-not-enough-data.component';
import { IonicModule } from '@ionic/angular';

@NgModule({
  declarations: [
    HourlyPayAnalyticsSettingsComponent,
    HourlyPayAnalyticsHeatmapComponent,
    HourlyPayAnalyticsComponent,
    HourlyPayAnalyticsTrendComponent,
    HourlyPayAnalyticsTrendEmployerListComponent,
    HourlyPayAnalyticsFooterMakeBetterComponent,
    HourlyPayAnalyticsMissingDataComponent,
    HourlyPayAnalyticsWelcomeComponent,
    HourlyPayAnalyticsMetroNotEnoughDataComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    IonicSelectableModule
  ],
  exports: [
    HourlyPayAnalyticsComponent
  ]
})
export class HourlyPayAnalyticsModule { }
