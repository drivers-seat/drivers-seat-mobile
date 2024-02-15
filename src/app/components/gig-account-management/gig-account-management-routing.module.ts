import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { GigAccountManagementComponent } from './gig-account-management/gig-account-management.component';


const routes: Routes = [
  {
    path: '',
    component: GigAccountManagementComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class GigAccountManagementRoutingModule {}
