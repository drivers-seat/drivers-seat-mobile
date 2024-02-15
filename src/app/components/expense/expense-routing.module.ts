import { NgModule } from '@angular/core';
import { ExpenseListComponent } from './expense-list/expense-list.component';
import { ExpenseEditComponent } from './expense-edit/expense-edit.component';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    component: ExpenseListComponent
  },
  {
    path: 'list',
    component: ExpenseListComponent
  }
];


@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ExpenseRoutingModule {}
