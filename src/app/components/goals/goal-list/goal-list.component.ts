import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TimeHelper } from 'src/app/helpers/TimeHelper';
import { Goal, GoalType } from 'src/app/models/Goal';
import { StatSummaryLevel } from 'src/app/models/PerformanceStatistic';
import { IGoalTrackingService } from 'src/app/services/goal-tracking/goal-tracking.service';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import { GoalEditComponent } from '../goal-edit/goal-edit.component';
import { getUnixTime, startOfDay } from 'date-fns';
import { UserService } from 'src/app/services/user.service';
import { User } from 'src/app/models/User';
import { TextHelper } from 'src/app/helpers/TextHelper';
import { IModalService } from 'src/app/services/modal/modal.service';
import { IUserSupportService } from 'src/app/services/user-support/user-support.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'goal-list',
  templateUrl: './goal-list.component.html',
  styleUrls: [
    '../goals.scss',
    './goal-list.component.scss'
  ],
})
export class GoalListComponent implements OnInit {

  private readonly _logger: Logger;

  public get appDisplayName(): string { return environment.appDisplayName; }

  @Input()
  public goal_type: GoalType;

  private _frequency: StatSummaryLevel;
  @Input()
  public get goal_frequency(): StatSummaryLevel
  {
    return this._frequency;
  }

  public set goal_frequency(level: StatSummaryLevel){
    this._frequency = level;
    this.fetch_goals();
  }


  public goals: Goal[];

  private _user: User;

  public readonly TimeHelper: TimeHelper = TimeHelper.Instance;

  constructor(
    logSvc: ILogService,
    private readonly _userSvc: UserService,
    private readonly _goalSvc: IGoalTrackingService,
    private readonly _modalSvc: IModalService,
    private readonly _userSupportSvc: IUserSupportService
  ) {
    this._logger = logSvc.getLogger("GoalListComponent")

    this._goalSvc.goalsChanged$.subscribe(async frequency => {

      if (frequency != this.goal_frequency) {
        return;
      }

      await this.fetch_goals();
    });

    this._userSvc.currentUser$.subscribe(async u => {

      const oldUser = this._user;
      this._user = u;
      if (oldUser?.id != this._user?.id) {
        await this.fetch_goals();
      }
    })
  }

  ngOnInit() { }

  public ionViewWillEnter() {
    this._logger.LogDebug("ionViewWillEnter");
  }

  private async fetch_goals():Promise<void> {

    this._logger.LogDebug("fetch_goals", this._frequency, this.goal_type);

    this.goals = null;

    if (!this.goal_type || !this.goal_frequency) {
      return;
    }

    const goals = await this._goalSvc.getGoals(this.goal_frequency);

    this.goals = goals.map(g => {
      const goal = { ...g };
      goal["sub_goals_info"] = this.getSubgoals(g);
      return goal;
    })
  }

  public get title(): string {
    switch (this.goal_frequency) {
      case StatSummaryLevel.day:
        return "Daily Goals"
      case StatSummaryLevel.week:
        return "Weekly Goals"
      case StatSummaryLevel.month:
        return "Monthly Goals"
    }
    return "";
  }

  public async onGoalClick(goal: Goal) {
    await this.presentEditor(goal, false);
  }

  public async onNewGoalClick(start_date_unix?: number) {

    const goal = new Goal();
    goal.type = this.goal_type;
    goal.frequency = this.goal_frequency;
    goal.sub_goals = {};
    goal.start_date_unix = start_date_unix || getUnixTime(startOfDay(new Date()));

    await this.presentEditor(goal, true);
  }

  private getSubgoals(goal: Goal) {

    if (goal.sub_goals && goal.sub_goals["all"]) {
      return [{
        title: `each ${goal.frequency}`,
        amount: goal.sub_goals["all"]
      }]
    }

    const items = new Array<any>();
    this._logger.LogDebug("here");
    TimeHelper.daysOfWeek.forEach(day => {

      const dayNumber = TimeHelper.dayNameToNumberMatrix[day];

      if (!goal.sub_goals[dayNumber]) {
        return;
      }

      if (items.length == 0 || items[items.length - 1].amount != goal.sub_goals[dayNumber]) {
        items.push({
          title: [TextHelper.capitalizeFirstLetter(day.substring(0, 3))],
          amount: goal.sub_goals[dayNumber]
        });
        return;
      }

      items[items.length - 1].title.push(TextHelper.capitalizeFirstLetter(day.substring(0, 3)));
    });

    items.forEach(item => item.title = TextHelper.toFriendlyCsv("and", item.title));
    return items;
  }

  private async presentEditor(goal: Goal, isNew: boolean) {

    await this._modalSvc.open("goal_edit", {
      component: GoalEditComponent,
      componentProps: {
        goal: goal,
        isNew: isNew
      }
    }, goal);
  }

  public async getDriversSeatHelpClick(){
    await this._userSupportSvc.composeMessage("Earnings Goals", "Hi, I would like some help in setting my earnings goals.");
  }

}
