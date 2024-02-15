import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShiftTrackingToggleComponent } from './shift-tracking-toggle/shift-tracking-toggle.component';
import { ShiftTrackingHelpComponent } from './shift-tracking-help/shift-tracking-help.component';
import { ShiftSummaryComponent } from './shift-summary/shift-summary.component';
import { ShiftTrackingStatsComponent } from './shift-tracking-stats/shift-tracking-stats.component';
import { ShiftTrackingWelcomeComponent } from './shift-tracking-welcome/shift-tracking-welcome.component';
import { ShiftsRoutingModule } from './shifts-routing.module';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';



@NgModule({
  declarations: [
    ShiftTrackingToggleComponent,
    ShiftTrackingHelpComponent,
    ShiftSummaryComponent,
    ShiftTrackingStatsComponent,
    ShiftTrackingWelcomeComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ShiftsRoutingModule
  ],
  exports: [
    ShiftTrackingToggleComponent,
    ShiftTrackingStatsComponent
  ]
})
export class ShiftsModule { }
