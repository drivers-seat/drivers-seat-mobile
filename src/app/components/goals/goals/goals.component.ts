import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AlertButton, AlertInput, AlertOptions } from '@ionic/angular';
import { getUnixTime } from 'date-fns';
import { TextHelper } from 'src/app/helpers/TextHelper';
import { Goal, GoalType } from 'src/app/models/Goal';
import { StatSummaryLevel } from 'src/app/models/PerformanceStatistic';
import { IBrowserNavigationService } from 'src/app/services/browser-navigation/browser-navigation.service';
import { IGoalTrackingService } from 'src/app/services/goal-tracking/goal-tracking.service';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import { IModalService } from 'src/app/services/modal/modal.service';
import { StatsService } from 'src/app/services/stats/stats.service';
import { UserService } from 'src/app/services/user.service';
import { GoalEditComponent } from '../goal-edit/goal-edit.component';
import { IUserSupportService } from 'src/app/services/user-support/user-support.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'goals',
  templateUrl: './goals.component.html',
  styleUrls: [
    '../goals.scss',
    './goals.component.scss'
  ],
})
export class GoalsComponent implements OnInit {

  private readonly _logger: Logger;
  
  public get appDisplayName(): string { return environment.appDisplayName; }

  public readonly TextHelper:TextHelper = TextHelper.instance;

  public readonly levels:StatSummaryLevel[] = [
    StatSummaryLevel.day,
    StatSummaryLevel.week,
    StatSummaryLevel.month
  ]

  public readonly goalType: GoalType = 'earnings'; 

  public activeLevel: StatSummaryLevel = this.levels[0];
  public hasAnyGoals: boolean = null;

  constructor(
    logSvc: ILogService,
    private readonly _navSvc: IBrowserNavigationService,
    private readonly _routeSvc: ActivatedRoute,
    private readonly _goalsSvc: IGoalTrackingService,
    private readonly _userSvc: UserService,
    private readonly _modalSvc: IModalService,
    private readonly _statsSvc: StatsService,
    private readonly _userSupportSvc: IUserSupportService
  ) { 

    this._logger = logSvc.getLogger("GoalsComponent");

    this._routeSvc.queryParams.subscribe(async params => {

      const freq = params["frequency"];

      if(!freq){
        return;
      }

      if(this.levels.indexOf(freq) == -1){
        return;
      }

      this.setActiveLevel(freq);
    });

    this._userSvc.currentUser$.subscribe(async u => await this.checkIfAnyGoals());
    this._goalsSvc.goalsChanged$.subscribe(async x=> await this.checkIfAnyGoals());
    // this._statsSvc.statsChanged$.subscribe(async x=>  )
  }

  private async checkIfAnyGoals(){
    const goals: Goal[] = [];
    await Promise.all(this.levels.map(level => this._goalsSvc.getGoals(level).then(g => goals.push(...g))));
    this.hasAnyGoals = goals.length > 0;
  }

  private async getLatestEarningsDate(){

  }

  ngOnInit() {}

  public setActiveLevel(level: StatSummaryLevel){
    this.activeLevel = level;
  }

  public getLevelName(level: StatSummaryLevel):string{
    switch(level){
      case StatSummaryLevel.day:
        return "daily";
      case StatSummaryLevel.week:
        return "weekly";
      case StatSummaryLevel.month:
        return "monthly";
      case StatSummaryLevel.year:
        return "yearly"
    }
    return null;
  }

  public async onCancel() {
    await this._navSvc.navigateBack();
  }

  public async getDriversSeatHelpClick(){
    await this._userSupportSvc.composeMessage("Earnings Goals", "Hi, I would like some help in setting my earnings goals.");
  }

  public async onNewGoalClick() {

    const alertInputs = this.levels.map(level =>{

      const option:AlertInput = {
        label: TextHelper.capitalizeFirstLetter(this.getLevelName(level)),
        value: level,
        type: 'radio'
      }

      return option;
    })

    const okButton:AlertButton = {
      text: "OK",
      id: "ok",
      role: "ok"
    }

    const cancelButton:AlertButton = {
      text: "Cancel",
      id: "cancel",
      role: "cancel"
    }

    const alert: AlertOptions = {
      id: "new_goal_type",
      header: "What type of goal would you like to create?",
      buttons: [cancelButton, okButton],
      inputs: alertInputs
    }

    const alertObj = await this._modalSvc.open_alert(alert.id, alert);
    const alertResult = await alertObj.onDidDismiss();

    if(alertResult?.role != "ok" || !alertResult?.data?.values){
      return;
    }

    this._logger.LogDebug("handlerPopup","alert result", alertResult);

    const goal = new Goal();
    goal.type= "earnings";
    goal.frequency = alertResult?.data?.values;

    this.activeLevel = goal.frequency;

    const window = this._statsSvc.getStatsWindowForDate(new Date(), goal.frequency);

    goal.start_date_unix = getUnixTime(window.startRange);
    
    await this._modalSvc.open("goal_edit",{
      component: GoalEditComponent,
      componentProps: {
        goal: goal,
        isNew: true
      }});
  }

}
