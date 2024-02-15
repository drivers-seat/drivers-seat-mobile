import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { IExpenseService } from 'src/app/services/expenses.service';
import { LogService } from 'src/app/services/logging/log.service';
import { ActivatedRoute } from '@angular/router';
import { StatSummaryLevel, StatsWindow } from 'src/app/models/PerformanceStatistic';
import { format, fromUnixTime, getUnixTime, startOfDay } from 'date-fns';
import { Expense, ExpenseType } from "src/app/models/Expense";
import { Logger } from 'src/app/services/logging/logger';
import { TimeHelper } from 'src/app/helpers/TimeHelper';
import { LoadingController, ToastController } from '@ionic/angular';
import { ExpenseEditComponent } from '../expense-edit/expense-edit.component'
import { StatsService } from 'src/app/services/stats/stats.service';
import { IBrowserNavigationService } from 'src/app/services/browser-navigation/browser-navigation.service';
import { Chart } from 'chart.js';
import { UserService } from 'src/app/services/user.service';
import { ApiService } from 'src/app/services/api.service';
import { IModalService } from 'src/app/services/modal/modal.service';
import { UserTrackingService } from 'src/app/services/user-tracking/user-tracking.service';

@Component({
  selector: 'expense-list',
  templateUrl: './expense-list.component.html',
  styleUrls: [
    '../expense.scss',
    './expense-list.component.scss'
  ],
})
export class ExpenseListComponent implements OnInit {

  private readonly _logger: Logger;

  private _routeParamsSubscription: any;

  public selectedTab: 'categories' | 'details' = 'details';

  public window: StatsWindow;
  
  public expenses: Expense[];
  public categorySummary: { category: string; total: number; }[];

  public TimeHelper: TimeHelper = TimeHelper.Instance;
  private readonly _expenseTypes: ExpenseType[];
  private readonly _expenseTypesMatrix: { [key: string]: ExpenseType };

  @ViewChild('expenseCanvas')
  private _expenseCanvas: ElementRef;
  private _expenseChart: Chart<"pie", number[], unknown>;
  
  public get canDownload():boolean {
    return !this._apiSvc.isGhosting && this.expenses?.length > 0;
  }

  constructor(
    logSvc: LogService,
    private readonly _userSvc: UserService,
    private readonly _apiSvc: ApiService,
    private readonly _expenseSvc: IExpenseService,
    private readonly _statsSvc: StatsService,
    private readonly _routeSvc: ActivatedRoute,
    private readonly _modalSvc: IModalService,
    private readonly _navSvc: IBrowserNavigationService,
    private readonly _loadingCtrl: LoadingController,
    private readonly _toastCtrl: ToastController,
    private readonly _userTrackingSvc: UserTrackingService
  ) {

    this._logger = logSvc.getLogger("ExpenseListComponent");

    this._expenseSvc.expenseChanged$.subscribe(async x => {
      this.updateExpenseForWindow();
    });

    this._expenseSvc.expenseDeleted$.subscribe(async x => {
      this.updateExpenseForWindow();
    });

    this._expenseTypes = this._expenseSvc.getExpenseTypes();
    this._expenseTypesMatrix = {};
    this._expenseTypes.forEach(x=>this._expenseTypesMatrix[x.name] = x);
  }

  private async updateExpenseForWindow(){
    if (!this.window){
      this.expenses = [];
      return;
    }
    
    this.expenses = null; //forces the spinner

    this.expenses = await this._expenseSvc.getExpensesForWindow(this.window);
    this.categorySummary = this.summarizeExpensesByCategory();
    this.updateExpenseGraphs();
  }

  public async setActiveTab(tab: 'categories' | 'details') {
    this.selectedTab = tab;

    if(this.expenses?.length > 0) {
      await this._userTrackingSvc.setScreenName(`expenses/list/${tab}`,this.window);
    } else {
      await this._userTrackingSvc.setScreenName(`expenses/no-expenses`,this.window);
    }
  } 

  public getExpenseTotalDeductible(): number {
    return this.expenses
    ?.filter(ex=> this._expenseTypesMatrix[ex.category] && this._expenseTypesMatrix[ex.category].isDeductible)
    .reduce((total, expense) => total + expense.money, 0);
  }

  public getExpenseTotalNonDeductible(): number {
    return this.getExpenseTotal() - this.getExpenseTotalDeductible();
  }

  public getExpenseTotal(): number {

    return this.expenses?.reduce((total, expense) => total + expense.money, 0);
  }

  private summarizeExpensesByCategory(): Array<{ category: string; total: number }>{

    const totals:{ [key:string]: { category: string, total: number }} = {};

    this.expenses.forEach(x=>{
      
      totals[x.category] = totals[x.category] || { category:x.category, total: 0};
      totals[x.category].total+= (x.money || 0);
      
    });

    const result= Object.values(totals)
      .sort((a, b) => b.total - a.total);

    this._logger.LogDebug("getExpenseCategorySummary", result);
    return result;
  }

  public async onExpenseClick(expense: Expense) {
    await this.openExpense({ ...expense }); //create copy
  }

  public async onNewExpense() {
    
    const now = startOfDay(new Date());
    let date = now;

    if (date < this.window.startRange){
      date = this.window.startRange;
    } else if (date > this.window.endRange) {
      date = this.window.endRange;
    }

    if(date > now){
      date = now;
    }

    const expense = new Expense();
    expense.date = startOfDay(date);
    expense.dateFmt = format(expense.date, "yyyy-MM-dd");
    expense.category = "";
    await this.openExpense(expense);
  }

  private async openExpense(expense: Expense) {

    const name = expense.id ? "expenses/edit" : "expenses/new"
    await this._modalSvc.open(name, {
      component: ExpenseEditComponent,
      componentProps: {
        expense: expense,    //create a copy
      }
    }, expense);
  }

  public async onClose() {
    await this._navSvc.navigateBack();
  }

  public async onDownload(){
    
    if(!this.canDownload){
      return;
    }

    const spinner = await this._loadingCtrl.create({
      message: "Exporting Expenses..."
    });

    await spinner.present();

    try {

      await this._expenseSvc.export(this.window);

      await this._toastCtrl.create({
        header: "Expenses Export",
        message: `Your request has been submitted.  When it's done, we'll send an email to ${this._userSvc.currentUser?.email || "you"}.`,
        position: 'bottom',
        duration: 5000,
        cssClass: "pop-up",   //in global.scss
      }).then(t => t.present());

    }
    finally {
      await spinner.dismiss();
    }
  }

  public async ngOnInit() {
    this._routeParamsSubscription = this._routeSvc.queryParams.subscribe(async params => {

      const start_date_unix = +params['start'] || getUnixTime(new Date());
      const level = params['level'] || StatSummaryLevel.year;
      const autoAdd = params['addNew']
      this.window = this._statsSvc.getStatsWindowForDate(fromUnixTime(start_date_unix), level as StatSummaryLevel);

      if(autoAdd == 'true'){
        this.onNewExpense();
      }

      await this.updateExpenseForWindow();
      await this.setActiveTab('details');
    });
  }

  ngOnDestroy() {
    this._routeParamsSubscription.unsubscribe();
  }

  public getExpenseTypeBorderColor(type: string): string {
    const expenseType = this._expenseTypesMatrix[type];
    return expenseType?.colorHex || "FFFFFF";
  }

  public getExpenseTypeBackgroundColor(type: string): string {
    const expenseType = this._expenseTypesMatrix[type];
    return (expenseType?.colorHex || "FFFFFF") + "80";
  }

  private updateExpenseGraphs() {

    const datasets = [{
      data: this.categorySummary.map(c=>c.total),
      backgroundColor: this.categorySummary.map(c=> this.getExpenseTypeBackgroundColor(c.category)),
      borderColor: "#808080"
    }]

    if(this._expenseChart){
      this._expenseChart.data.datasets = datasets;
      this._expenseChart.update();
      return;
    }


    this._expenseChart = new Chart(this._expenseCanvas.nativeElement, {
      type: 'pie',
      data: {
        datasets: datasets
      },
      options: {
        responsive: true,
        events: []
      }
    });

    this._expenseChart.tooltip.options.enabled = false;
    this._expenseChart.legend.options.display = false;
  }

}
