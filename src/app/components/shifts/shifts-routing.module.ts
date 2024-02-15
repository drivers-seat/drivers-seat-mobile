import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ShiftTrackingWelcomeComponent } from './shift-tracking-welcome/shift-tracking-welcome.component';
import { ShiftTrackingHelpComponent } from './shift-tracking-help/shift-tracking-help.component';

const routes: Routes = [
  {
    path: 'help',
    component: ShiftTrackingHelpComponent
  }
];


@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ShiftsRoutingModule {}
