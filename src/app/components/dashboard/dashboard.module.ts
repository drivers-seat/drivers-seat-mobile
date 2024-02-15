import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { DashboardRoutingModule } from './dashboard-routing.module';
import { DashboardComponent } from './dashboard/dashboard.component';
import { MarketingModule } from '../marketing/marketing.module';
import { EarningsSummaryComponent } from './earnings-summary/earnings-summary.component';
import { DashboardHeaderComponent } from './dashboard-header/dashboard-header.component';
import { GoalsModule } from '../goals/goals.module';



@NgModule({
  declarations: [
    DashboardComponent,
    EarningsSummaryComponent,
    DashboardHeaderComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DashboardRoutingModule,
    MarketingModule,
    GoalsModule
  ]
})
export class DashboardModule { }
