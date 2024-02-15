import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoalListComponent } from './goal-list/goal-list.component';
import { GoalsRoutingModule } from './goals-routing.module';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { GoalEditComponent } from './goal-edit/goal-edit.component';
import { GoalsComponent } from './goals/goals.component';



@NgModule({
  declarations: [
    GoalListComponent,
    GoalEditComponent,
    GoalsComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    GoalsRoutingModule
  ],
  exports: [
  ]
})
export class GoalsModule { }
