import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { GoalListComponent } from './goal-list/goal-list.component';
import { GoalsComponent } from './goals/goals.component';

const routes: Routes = [
  {
    path: '',
    component: GoalsComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class GoalsRoutingModule { }
