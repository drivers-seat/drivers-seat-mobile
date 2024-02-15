import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatsViewComponent } from './stats-view/stats-view.component';
import { StatsPageComponent } from './stats-page/stats-page.component';
import { StatsNavigationComponent } from './stats-navigation/stats-navigation.component';
import { FormattedNumberPipe } from 'src/app/pipes/formatted-number-pipe';
import { StatsViewSummaryComponent } from './stats-view-summary/stats-view-summary.component';
import { StatsViewTrendComponent } from './stats-view-trend/stats-view-trend.component';
import { StatsHourlyTrendPopupComponent } from './stats-hourly-trend-popup/stats-hourly-trend-popup.component';
import { StatsViewByPlatformComponent } from './stats-vew-by-platform/stats-view-by-platform.component';
import { StatsWelcomeComponent } from './stats-welcome/stats-welcome.component';
import { StatsWaitingForDataComponent } from './stats-waiting-for-data/stats-waiting-for-data.component';
import { StatsGigAcctProblemComponent } from './stats-gig-acct-problem/stats-gig-acct-problem.component';
import { ExportRequestComponent } from './export-request/export-request.component';
import { StatsViewWorkDetailsComponent } from './stats-view-work-details/stats-view-work-details.component';
import { StatsViewWorkDetailsSummaryComponent } from './stats-view-work-details-summary/stats-view-work-details-summary.component';
import { StatsViewWorkDetailsWorkdayComponent } from './stats-view-work-details-workday/stats-view-work-details-workday.component';
import { ActivityDetailComponent } from './activity-detail/activity-detail.component';
import { WorkTimeEditorComponent } from './work-time-editor/work-time-editor.component';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { GoalPerformanceComponent } from './goal-performance/goal-performance.component';
import { GoalsModule } from '../goals/goals.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    GoalsModule
  ],
  declarations: [
    StatsViewComponent,
    StatsViewByPlatformComponent,
    StatsViewSummaryComponent,
    StatsViewTrendComponent,
    StatsNavigationComponent,
    StatsPageComponent,
    FormattedNumberPipe,
    StatsHourlyTrendPopupComponent,
    StatsWelcomeComponent,
    StatsWaitingForDataComponent,
    StatsGigAcctProblemComponent,
    ExportRequestComponent,
    StatsViewWorkDetailsComponent,
    StatsViewWorkDetailsSummaryComponent,
    StatsViewWorkDetailsWorkdayComponent,
    ActivityDetailComponent,
    WorkTimeEditorComponent,
    GoalPerformanceComponent
  ],
  exports : [
    StatsPageComponent
  ]
})
export class StatsModule { }
