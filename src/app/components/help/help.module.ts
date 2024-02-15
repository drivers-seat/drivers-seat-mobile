import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HelpRequestComponent } from './help-request/help-request.component';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { PublicTermsOfServiceComponent } from './public-terms-of-service/public-terms-of-service.component';
import { UpdateRequiredComponent } from './update-required/update-required.component';
import { MaintenanceModeComponent } from './maintenance-mode/maintenance-mode.component';



@NgModule({
  declarations: [
    HelpRequestComponent,
    PublicTermsOfServiceComponent,
    UpdateRequiredComponent,
    MaintenanceModeComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
  ],
  exports: [
    HelpRequestComponent,
    PublicTermsOfServiceComponent,
    UpdateRequiredComponent,
    MaintenanceModeComponent
  ]
})
export class HelpModule { }
