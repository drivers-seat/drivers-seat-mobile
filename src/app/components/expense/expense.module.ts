import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExpenseListComponent } from './expense-list/expense-list.component';
import { ExpenseEditComponent } from './expense-edit/expense-edit.component';
import { ExpenseRoutingModule } from './expense-routing.module';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';



@NgModule({
  declarations: [
    ExpenseListComponent,
    ExpenseEditComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ExpenseRoutingModule
  ]
})
export class ExpenseModule { }
