import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { HomePage } from './home.page';

import { HomePageRoutingModule } from './home-routing.module';
import { StatsModule } from 'src/app/components/stats/stats.module';
import { ShiftsModule } from 'src/app/components/shifts/shifts.module';
import { HourlyPayAnalyticsModule } from 'src/app/components/analytics/hourly-pay-analytics/hourly-pay-analytics.module';
import { DashboardModule } from 'src/app/components/dashboard/dashboard.module';


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    HomePageRoutingModule,
    StatsModule,
    HourlyPayAnalyticsModule,
    ShiftsModule,
    DashboardModule
  ],
  declarations: [
    HomePage,
  ]
})
export class HomePageModule {}
