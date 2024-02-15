import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { LoadingController, ToastController } from '@ionic/angular';
import { format, isDate, parse, startOfDay } from 'date-fns';
import { Expense, ExpenseType } from 'src/app/models/Expense';
import { ApiService } from 'src/app/services/api.service';
import { IExpenseService } from 'src/app/services/expenses.service';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import { IModalService } from 'src/app/services/modal/modal.service';

@Component({
  selector: 'app-expense-edit',
  templateUrl: './expense-edit.component.html',
  styleUrls: [
    '../expense.scss',
    './expense-edit.component.scss'
  ],
})
export class ExpenseEditComponent implements OnInit {

  private readonly _logger: Logger;

  public expense: Expense;
  public expenseTypes: ExpenseType[];
  public expenseTypesMatrix: { [key: string]: ExpenseType };
  public moneyTxt: string;
  public messages: { [key: string]: string } = {};
  public editStatus: { [key: string]: boolean } = {};



  @ViewChild('amount',{static: false})
  private _amountCtrl: ElementRef<HTMLInputElement>;

  constructor(
    logSvc: ILogService,
    private readonly _apiSvc: ApiService,
    private readonly _expenseSvc: IExpenseService,
    private readonly _modalSvc: IModalService,
    private readonly _loadingCtrl: LoadingController,
    private readonly _toastCtrl: ToastController
  ) {
    this._logger = logSvc.getLogger("ExpenseEditComponent");

    this.expenseTypes = this._expenseSvc.getExpenseTypes();
    this.expenseTypesMatrix = {};
    this.expenseTypes.forEach(x => this.expenseTypesMatrix[x.name] = x);
  }

  public async ionViewWillEnter() {
    
    if(this.expense?.money){
      this.moneyTxt =  `${this.expense.money}`;
    } else {
      this.moneyTxt = null;
    }

    this.editStatus = {
      name: false,
      money: false,
      date: false,
      category: false
    };

    this.amountChanged();

    this.validate();
  }

  public async ionViewDidEnter() {
    
    
    if(this._amountCtrl?.nativeElement && !this.expense.id){
      setTimeout(() => {
        this._amountCtrl.nativeElement.focus();  
      },0);
      
    }
  }

  public async onSave() {
    
    this.validate();
    if(!this.canSubmit){
      return;
    }

    if(this._apiSvc.isGhosting){
      
      await this.onCancel();

      await this._toastCtrl.create({
        message: "You cannot change expenses when ghosting",
        position: 'bottom',
        duration: 3000,
        cssClass: "pop-up"
      })
      .then(async t => await t.present());

      return;
    }

    const spinner = await this._loadingCtrl.create({
      message: "saving expense..."
    });

    await spinner.present();

    try {
      await this._expenseSvc.saveExpense(this.expense);

      await this.onCancel();

      await this._toastCtrl.create({
        message: "Your Expense has been saved",
        position: 'bottom',
        duration: 3000,
        cssClass: "pop-up"
      })
      .then(async t => await t.present());

    }
    finally {
      await spinner.dismiss();
    }
  }

  public async onDelete() {

    if(this._apiSvc.isGhosting){
      
      await this.onCancel();

      await this._toastCtrl.create({
        message: "You cannot delete when ghosting",
        position: 'bottom',
        duration: 3000,
        cssClass: "pop-up"
      })
      .then(async t => await t.present());

      return;
    }

    const spinner = await this._loadingCtrl.create({
      message: "deleting expense..."
    });

    await spinner.present();

    try {

      await this._expenseSvc.deleteExpense(this.expense);

      await this.onCancel();

      await this._toastCtrl.create({
        message: "Your Expense has been deleted",
        position: 'bottom',
        duration: 3000,
        cssClass: "pop-up"
      })
      .then(async t => await t.present());

    }
    finally {
      await spinner.dismiss();
    }
  }

  public async onCancel() {
    await this._modalSvc.dismiss();
  }

  public async onDateChange() {

    this._logger.LogDebug("onDateChange",this.expense.dateFmt, isDate(this.expense.dateFmt));
    
    if(!this.expense.dateFmt){
      this.expense.date = null;
      this.validate();
      return;
    }

    this.expense.date = parse(this.expense.dateFmt, "yyyy-MM-dd", new Date());

    this.validate();
  }

  public onDateToday(){
    
    this.expense.dateFmt = format(new Date(),"yyyy-MM-dd");
    this.onDateChange();
  }

  public amountFocused(){
    this.moneyTxt = this.moneyTxt?.replace("$","") || "";
  }

  public fieldBlurred(field: string) {
    this.editStatus[field] = true;
  }

  public amountChanged() {

    if (!this.moneyTxt){
      this.expense.money = 0;
      this.moneyTxt = null;
      return;
    }

    if (Number.isNaN(this.moneyTxt)){
      return;
    }

    this.moneyTxt = parseFloat(this.moneyTxt).toFixed(2);
    this.expense.money = parseFloat(this.moneyTxt);

    this.validate();
  }

  public amountKeyUp(){
    if (Number.isNaN(this.moneyTxt)){
      return;
    }

    this.expense.money = parseFloat(this.moneyTxt);
    this.validate();
  }

  public nameChanged(){
    if(this.expense)
    {
      this.expense.name = this.expense?.name?.trim();
    }

    this.validate();
  }

  public validate(){
    this.messages = {};

    if(!(this.expense?.money > 0)){
      this.messages["money"] = "A value > $0 is required"
    }

    if(!this.expense?.category){
      this.messages["category"] = "A value is required for expense category"
    }

    if(!this.expense?.date){
      this.messages["date"] = "A value is required for expense date"
    }

    if(!this.expense?.name?.trim()){
      this.messages["name"] = "A value is required for description"
    }
  }

  public get canSubmit():boolean {
    const canSubmit = Object.keys(this.messages).length == 0;
    return canSubmit;
  }

  ngOnInit() { }
}
