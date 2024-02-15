import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Expense, ExpenseType } from "../models/Expense";
import { UserTrackingService } from './user-tracking/user-tracking.service';
import { TrackedEvent } from '../models/TrackedEvent';
import { BehaviorSubject } from 'rxjs';
import { ILogService } from './logging/log.service';
import { Cache } from '../models/CacheItem';
import { Logger } from './logging/logger';
import { StatsWindow } from '../models/PerformanceStatistic';
import { UserService } from './user.service';
import { User } from '../models/User';
import { format } from 'date-fns';

export abstract class IExpenseService {

  public abstract expenseChanged$: BehaviorSubject<Expense>;
  public abstract expenseDeleted$: BehaviorSubject<number>;
  public abstract getExpensesForWindow(window: StatsWindow): Promise<Expense[]>;
  public abstract getExpense(id: number): Promise<Expense>;
  public abstract getExpenseTypes(): ExpenseType[];
  public abstract saveExpense(expense: Expense):Promise<Expense>;
  public abstract deleteExpense(expense: Expense):Promise<void>;
  public abstract export(window: StatsWindow): Promise<void>;

}

@Injectable({
  providedIn: 'root'
})
export class ExpensesService implements IExpenseService {

  public readonly expenseChanged$: BehaviorSubject<Expense> = new BehaviorSubject(null);
  public readonly expenseDeleted$: BehaviorSubject<number> = new BehaviorSubject(null);


  private readonly _logger: Logger;
  private readonly _expenseWindowCache: Cache<Expense[]>;
  private readonly _expenseCache: Cache<Expense>;
  private _currentUser: User;

  private readonly _expenseCacheExpirationSeconds: number = 300;

  private readonly _expenseTypes: ExpenseType[] = [
    {
      name: "Food and Drinks",
      isDeductible: true,
      colorHex: "#0000FF",
      image: "/assets/imgs/expenses/food-blue.png"
    },
    {
      name: "Gas",
      colorHex: "#103d10",
      isDeductible: false,
      image: "/assets/imgs/expenses/gas-blue.png"
    },
    {
      name: "Parking",
      colorHex: "#ff8c00",
      isDeductible: true,
      image: "/assets/imgs/expenses/parking-blue.png"
    },
    {
      name: "Goodies",
      colorHex: "#ff008c",
      isDeductible: true,
      image: "/assets/imgs/expenses/goodies-blue.png"
    },
    {
      name: "Tolls",
      colorHex: "#1b0019",
      isDeductible: true,
      image: "/assets/imgs/expenses/tolls-blue.png"
    },
    {
      name: "Service",
      colorHex: "#10003e",
      isDeductible: false,
      image: "/assets/imgs/expenses/service-blue.png"
    },
    {
      name: "Inspections",
      colorHex: "#4c0202",
      isDeductible: true,
      image: "/assets/imgs/expenses/inspections-blue.png"
    },
    {
      name: "Dashcam",
      colorHex: "#d00808",
      isDeductible: true,
      image: "/assets/imgs/expenses/dashcam-blue.png"
    },
    {
      name: "Music and Paid Apps",
      colorHex: "#7d0746",
      isDeductible: true,
      image: "/assets/imgs/expenses/music-blue.png"
    },
    {
      name: "Roadside Assistance",
      colorHex: "#000000",
      isDeductible: true,
      image: "/assets/imgs/expenses/roadside-blue.png"
    },
    {
      name: "Other",
      colorHex: "#cccccc",
      isDeductible: true,
      image: "/assets/imgs/expenses/other-blue.png"
    }
  ];

  constructor(
    logSvc: ILogService,
    private readonly _userSvc: UserService,
    private readonly _httpSvc: HttpClient,
    private readonly _apiSvc: ApiService,
    private readonly _userTrackingSvc: UserTrackingService
  ) {

    this._logger = logSvc.getLogger("ExpensesService");
    this._expenseWindowCache = new Cache<Expense[]>("ExpensesForWindow", this._expenseCacheExpirationSeconds, logSvc);
    this._expenseCache = new Cache<Expense>("Expenses", this._expenseCacheExpirationSeconds, logSvc);

    this._userSvc.currentUser$.subscribe(u => {

      const oldUser = this._currentUser;
      this._currentUser = u;

      if (this._currentUser?.id != oldUser?.id) {
        this._expenseCache.clear();
        this._expenseWindowCache.clear();
      }
    });
  }

  public getExpenseTypes(): ExpenseType[] {
    return this._expenseTypes;
  }

  public async getExpensesForWindow(window: StatsWindow): Promise<Expense[]> {

    const result = await this._expenseWindowCache.getItem(window.key, async k => {


      const startFmt = format(window.startRange, "yyyy-MM-dd");
      const endFmt = format(window.endRange, "yyyy-MM-dd");

      const data = await this._httpSvc.get(`${this._apiSvc.url()}/expenses?max_date=${endFmt}&since_date=${startFmt}`)
        .toPromise();

      const expenses: Expense[] = data["data"]
        ? data["data"].map(d => Expense.parse(d))
        : []

      expenses
        .filter(x => x.id)
        .forEach(x => this._expenseCache.setItem(`${x.id}`, x));

      return expenses;
    });

    return result;
  }

  public async getExpense(id: number): Promise<Expense> {

    const expense = this._expenseCache.getItem(`${id}`, async k => {

      const data = await this._httpSvc.get(`${this._apiSvc.url()}/expenses/${k}`).toPromise();

      if (data["data"]) {
        return Expense.parse(data["data"])
      }
      else {
        return null;
      }
    });

    return expense;
  }

  public async saveExpense(expense: Expense):Promise<Expense>{
    
    if(this._apiSvc.isGhosting){
      this._logger.LogInfo("saveExpense","Ignoring request to save during ghost session");
      return expense;
    }

    const postModel = {
      expense: {...expense}
    };

    postModel.expense.money = Math.floor((postModel.expense.money || 0) * 100);
    
    const data = expense.id
      ? await this._httpSvc.put(`${this._apiSvc.url()}/expenses/${expense.id}`, postModel).toPromise()
      : await this._httpSvc.post(`${this._apiSvc.url()}/expenses`, postModel).toPromise();
    
    const resultExpense = Expense.parse(data["data"]);

    this._expenseCache.clear();
    this._expenseWindowCache.clear();

    this.expenseChanged$.next(resultExpense);
    await this._userTrackingSvc.captureEvent(expense.id ? TrackedEvent.expense_update : TrackedEvent.expense_create, resultExpense);
    return resultExpense;
  }

  public async deleteExpense(expense: Expense):Promise<void> {
    
    if(this._apiSvc.isGhosting){
      this._logger.LogInfo("saveExpense","Ignoring request to save during ghost session");
      return;
    }
    
    if(!expense?.id){
      this._logger.LogWarning("deleteExpense","Ignoring attempt to delete expense without id", expense);
      return;
    }

    await this._httpSvc.delete(`${this._apiSvc.url()}/expenses/${expense.id}`).toPromise();

    this._expenseCache.clear();
    this._expenseWindowCache.clear();
    
    this.expenseDeleted$.next(expense.id);

    await this._userTrackingSvc.captureEvent(TrackedEvent.expense_delete, expense);
  }

  public async export(window: StatsWindow) {

    const postModel = {
      query: {
        date_start: window.startRange,
        date_end: window.endRange,
      }
    };

    const eventModel = {
      window: window.title,
      date_start: window.startRange,
      date_end: window.endRange
    };

    const url = `${this._apiSvc.url()}/expenses/export`;

    await this._httpSvc.post(url, postModel).toPromise();
    await this._userTrackingSvc.captureEvent(TrackedEvent.Export_Expensess, eventModel);
  }
}
