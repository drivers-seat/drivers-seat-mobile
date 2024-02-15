import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StatsPageComponent } from 'src/app/components/stats/stats-page/stats-page.component';
import { HourlyPayAnalyticsComponent } from 'src/app/components/analytics/hourly-pay-analytics/hourly-pay-analytics/hourly-pay-analytics.component';
import { HomePage } from './home.page';
import { DashboardComponent } from 'src/app/components/dashboard/dashboard/dashboard.component';

const routes: Routes = [
  {
    path: '',
    component: HomePage,
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'earnings',
        component: StatsPageComponent,
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        component: DashboardComponent,
        pathMatch: 'full'
      },
      {
        path: 'insights',
        component: HourlyPayAnalyticsComponent,
        pathMatch: 'full'
      },
      {
        path: 'menu'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HomePageRoutingModule { }
