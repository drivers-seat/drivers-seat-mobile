import { Component, OnInit } from '@angular/core';
import { LoadingController, ToastController } from '@ionic/angular';
import { format, fromUnixTime, getUnixTime, isValid, parse, startOfMonth, startOfWeek } from 'date-fns';
import { TimeHelper } from 'src/app/helpers/TimeHelper';
import { Goal } from 'src/app/models/Goal';
import { StatSummaryLevel } from 'src/app/models/PerformanceStatistic';
import { ApiService } from 'src/app/services/api.service';
import { IGoalTrackingService } from 'src/app/services/goal-tracking/goal-tracking.service';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import { IModalService } from 'src/app/services/modal/modal.service';

@Component({
  selector: 'goal-edit',
  templateUrl: './goal-edit.component.html',
  styleUrls: [
    '../goals.scss',
    './goal-edit.component.scss'
  ],
})
export class GoalEditComponent implements OnInit {

  private readonly _logger: Logger;

  public isNew: boolean;
  public goal: Goal;

  public readonly TimeHelper: TimeHelper = TimeHelper.Instance;

  public model: {
    start_date?: string
    isSameEveryDay?: boolean
    amount_all?: any
    amount_monday?: any
    amount_tuesday?: any
    amount_wednesday?: any
    amount_thursday?: any
    amount_friday?: any
    amount_saturday?: any
    amount_sunday?: any
  }

  private _touchedFields: { [key: string]: boolean }
  private _validationMessages: { [key: string]: string[] }
  private _allFieldsTouched: boolean = false;

  public canSubmit: boolean;

  public isTouched(...field: string[]): boolean {
    if (this._allFieldsTouched) {
      return true;
    }

    const key = field.join("_");
    return this._touchedFields[key] || false;
  }

  public isValid(...field: string[]): boolean {
    const key = field.join("_");
    return (this._validationMessages[key] || []).length == 0;
  }

  constructor(
    logSvc: ILogService,
    private readonly _apiSvc: ApiService,
    private readonly _goalSvc: IGoalTrackingService,
    private readonly _loadingCtrl: LoadingController,
    private readonly _toastCtrl: ToastController,
    private readonly _modalSvc: IModalService
  ) {
    this._logger = logSvc.getLogger("GoalEditComponent");
  }

  ngOnInit() {
    this._logger.LogDebug("ngOnInit");

    this._touchedFields = {};
    this._validationMessages = {};

    this.buildModelFromGoal();

    this.canSubmit = this.validate();
  }

  public ionViewWillEnter() {
    this._logger.LogDebug("ionViewWillEnter");
  }

  public get title(): string {

    let title = this.isNew ? "New " : "Edit ";

    switch (this.goal?.frequency) {
      case StatSummaryLevel.day:
        title += "Daily Goal"
        break;

      case StatSummaryLevel.week:
        title += "Weekly Goal"
        break;

      case StatSummaryLevel.month:
        title += "Monthly Goal"
        break;

      default:
        title += "Goal";
    }
    return title;
  }

  private buildModelFromGoal() {

    this.model = {}
    this.model.isSameEveryDay = null;

    if (this.goal.sub_goals) {
      Object.keys(this.goal.sub_goals).forEach(k => {

        const key = (k == "all") ? k : TimeHelper.dayNumberToNameMatrix[k];

        this.model["amount_" + key] = this.goal.sub_goals[k]
        this.onAmountChanged("amount", key);

        if (k == "all") {
          this.model.isSameEveryDay = true;
        } else {
          this.model.isSameEveryDay = this.model.isSameEveryDay || false;
        }

        if (this.model.isSameEveryDay != null) {
          this.onOtherInputBlur("isSameEveryDay");
        }
      });
    }

    if (this.goal.start_date_unix) {
      switch (this.goal.frequency) {
        case StatSummaryLevel.day:
          this.model.start_date = format(fromUnixTime(this.goal.start_date_unix), "yyyy-MM-dd")
          break;

        case StatSummaryLevel.week:
          this.model.start_date = format(startOfWeek(fromUnixTime(this.goal.start_date_unix), { weekStartsOn: 1 }), "yyyy-MM-dd")
          break;

        case StatSummaryLevel.month:
          this.model.start_date = format(startOfMonth(fromUnixTime(this.goal.start_date_unix)), "yyyy-MM")
          break;
      }
      this.onDateBlur();
    }
  }

  private extractGoalFromModel(): Goal {

    const goal = new Goal();

    goal.frequency = this.goal.frequency;
    goal.type = this.goal.type;

    goal.start_date_unix = goal.frequency == StatSummaryLevel.month
      ? getUnixTime(parse(`${this.model.start_date}-01`, "yyyy-MM-dd", new Date()))
      : getUnixTime(parse(this.model.start_date, "yyyy-MM-dd", new Date()));

    if (this.model.isSameEveryDay || this.goal.frequency != StatSummaryLevel.day) {
      goal.sub_goals = {
        all: parseFloat(`${this.model.amount_all}`)
      };
    } else {
      goal.sub_goals = {}
      TimeHelper.daysOfWeek.forEach(d => {
        const val = parseFloat(`${this.model[`amount_${d}`]}`);
        if (isNaN(val) || val <= 0) {
          return;
        }
        goal.sub_goals[TimeHelper.dayNameToNumberMatrix[d]] = val;
      })
    }

    return goal;
  }

  public onSameEveryDayToggle(isSame: boolean) {

    //Don't do anything b/c values match
    if (isSame && this.model.isSameEveryDay) {
      this._logger.LogDebug("no change - true");
      return;
    }

    //Don't do anything b/c values match
    if (!isSame && this.model.isSameEveryDay == false) {
      this._logger.LogDebug("no change - false");
      return;
    }

    //if the value has not been set before, it's not a toggle.
    if (!isSame && !this.model.isSameEveryDay) {
      this.model.isSameEveryDay = false;
    } else {
      this.model.isSameEveryDay = !this.model.isSameEveryDay;
    }

    this.onOtherInputBlur("isSameEveryDay");
  }

  private onOtherInputBlur(...property: string[]) {
    const key = property.join("_");

    this._touchedFields[key] = true;

    this.canSubmit = this.validate();
  }

  public onAmountChanged(...property: string[]) {

    const key = property.join("_");
    const val = parseFloat(`${this.model[key]}`)

    if (isNaN(val)) {
      this.model[key] = null;
    } else {
      this.model[key] = val;
    }

    this.onAmountBlurImpl(property, false);
  }

  public onAmountBlur(...property: string[]) {
    this.onAmountBlurImpl(property, true);
  }

  private onAmountBlurImpl(property: string[], reformatValue: boolean) {

    const key = property.join("_");

    if (reformatValue) {
      const val = parseFloat(`${this.model[key]}`).toFixed(2);
      const newValue = parseFloat(val);

      if (isNaN(newValue)) {
        this.model[key] = null;
      } else {
        this.model[key] = val;
      }
    }

    this._touchedFields[key] = true;

    this.canSubmit = this.validate();
  }

  public onCurrentWindowClick() {

    switch (this.goal?.frequency) {
      case StatSummaryLevel.day:
        this.model.start_date = format(new Date(), "yyyy-MM-dd");
        break;
      case StatSummaryLevel.week:
        this.model.start_date = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
        break;
      case StatSummaryLevel.month:
        this.model.start_date = format(startOfMonth(new Date()), "yyyy-MM-dd");
        break;
    }
  }

  public async onDateBlur() {

    if (this.goal.frequency != StatSummaryLevel.week) {
      this.onOtherInputBlur("start_date");
      return;
    }

    let user_dtm = parse(this.model.start_date, "yyyy-MM-dd", new Date());

    if (!isValid(user_dtm)) {
      this.onOtherInputBlur("start_date");
      return;
    }

    const dtm = startOfWeek(user_dtm, { weekStartsOn: 1 });    //Week starts on Monday

    this.model.start_date = format(dtm, "yyyy-MM-dd");

    this.onOtherInputBlur("start_date");
  }

  public async onSave() {

    this._logger.LogDebug("onSave");

    this._allFieldsTouched = true;
    if (!this.validate()) {
      return;
    }

    const goal = this.extractGoalFromModel();
    const replace_start_date_unix = this.isNew
      ? null
      : this.goal.start_date_unix;

    const spinner = await this._loadingCtrl.create({
      message: "Saving..."
    });

    await spinner.present();

    try {

      if (this._apiSvc.isGhosting) {
        await this.displayToastMessage("Not saving goal during ghost session");
      } else {
        await this._goalSvc.saveGoal(goal, replace_start_date_unix);
        await this.displaySuccessToastMessage(goal, this.isNew ? "created" : "updated");
      }

      await this._modalSvc.dismiss("goal_edit");
    }
    finally {
      await spinner.dismiss();
    }
  }

  private async displayToastMessage(message: string) {

    await this._toastCtrl.create({
      message: message,
      duration: 3000,
      cssClass: "pop-up"
    }).then(c => c.present());
  }

  private async displaySuccessToastMessage(goal: Goal, action: string) {
    let msg = "";
    switch (goal.frequency) {
      case StatSummaryLevel.day:
        msg = "daily"
        break;
      case StatSummaryLevel.week:
        msg = "weekly"
        break;
      case StatSummaryLevel.month:
        msg = "monthly"
        break;
    }

    msg = `Your ${msg} ${goal.type} goal starting on ${TimeHelper.toShortDateUnix(goal.start_date_unix, true)} has been ${action}!`

    await this.displayToastMessage(msg);
  }

  public async onCancel() {
    await this._modalSvc.dismiss("goal_edit");
  }

  public async onDelete() {

    if (this.isNew) {
      return;
    }

    this._logger.LogDebug("onDelete");

    const spinner = await this._loadingCtrl.create({
      message: "Deleting..."
    });

    await spinner.present();

    try {

      if (this._apiSvc.isGhosting) {
        await this.displayToastMessage("Not deleting during ghost session");
      } else {
        await this._goalSvc.deleteGoal(this.goal);
        await this.displaySuccessToastMessage(this.goal, "deleted");
      }
      await this._modalSvc.dismiss("goal_edit");
    }
    finally {
      await spinner.dismiss();
    }
  }

  private validate(): boolean {

    this._validationMessages = {};

    if (!this.model.start_date) {
      this._validationMessages["start_date"] = ["a value is required"];
    } else {

      const dtmFmt = this.goal.frequency == StatSummaryLevel.month
        ? `${this.model.start_date}-01`
        : this.model.start_date

      const dtm = parse(dtmFmt, "yyyy-MM-dd", new Date());

      if (!isValid(dtm)) {
        this._validationMessages["start_date"] = ["invalid value"];
      }
    }

    if (this.goal.frequency == StatSummaryLevel.day && this.model.isSameEveryDay == null) {
      this._validationMessages["isSameEveryDay"] = ["A selection is required"];
    }

    if (this.goal.frequency != StatSummaryLevel.day || this.model.isSameEveryDay == true) {
      this._validationMessages["amount_all"] = this.validateAmount(this.model.amount_all, true)
    } else {
      TimeHelper.daysOfWeek.forEach(d => this._validationMessages["amount_" + d] = this.validateAmount(this.model["amount_" + d], false));
    }

    if (this.goal.frequency == StatSummaryLevel.day && this.model.isSameEveryDay == false) {
      if (!TimeHelper.daysOfWeek.some(d => this.model["amount_" + d] != null && this.model["amount_" + d] != "")) {
        TimeHelper.daysOfWeek.forEach(d => {
          this._validationMessages["amount_" + d] = this._validationMessages["amount_" + d] || [];
          this._validationMessages["amount_" + d].push("A value is required for at least one day");
        });
      }
    }

    return !Object.values(this._validationMessages).some(x => x?.length > 0)
  }

  private validateAmount(value, isRequired): string[] {

    if (!value || `${value}`.trim() == "") {

      if (isRequired) {
        return ["A value is required"];
      }

      return;
    }

    const val = parseFloat(`${value}`.trim());

    if (isNaN(val)) {
      return ["Invalid value"];
    }

    if (val == 0 && isRequired) {
      return ["A value is required"];
    }

    if (val < 0) {
      return ["value cannot be less than $0"];
    }

    return [];
  }
}
