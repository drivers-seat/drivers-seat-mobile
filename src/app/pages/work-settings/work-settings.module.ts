import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { WorkSettingsPageRoutingModule } from './work-settings-routing.module';

import { WorkSettingsPage } from './work-settings.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    WorkSettingsPageRoutingModule
  ],
  declarations: [WorkSettingsPage]
})
export class WorkSettingsPageModule { }
