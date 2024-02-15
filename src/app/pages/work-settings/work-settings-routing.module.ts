import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { WorkSettingsPage } from './work-settings.page';

const routes: Routes = [
  {
    path: '',
    component: WorkSettingsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class WorkSettingsPageRoutingModule {}
