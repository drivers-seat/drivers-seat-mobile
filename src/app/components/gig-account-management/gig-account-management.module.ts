import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GigAccountManagementComponent } from './gig-account-management/gig-account-management.component';
import { GigAccountManagementListComponent } from './gig-account-management-list/gig-account-management-list.component';
import { GigAccountManagementWelcomeComponent } from './gig-account-management-welcome/gig-account-management-welcome.component';
import { GigAccountManagementRoutingModule } from './gig-account-management-routing.module';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ArgyleHowUseDataComponent } from './argyle-how-use-data/argyle-how-use-data.component';



@NgModule({
  declarations: [
    GigAccountManagementComponent,
    GigAccountManagementListComponent,
    GigAccountManagementWelcomeComponent,
    ArgyleHowUseDataComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    GigAccountManagementRoutingModule
  ],
  exports: [
    GigAccountManagementComponent
  ]
})
export class GigAccountManagementModule { }
