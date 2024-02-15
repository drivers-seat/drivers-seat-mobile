import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, MenuController, ToastController, ToastOptions } from '@ionic/angular';
import { User } from "src/app/models/User";
import { dayOfWeek, hourOfDay, ScheduledShift, SchedulePickerConfig, UserWorkSettings } from 'src/app/models/UserPreferences';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import { UserService } from 'src/app/services/user.service';
import { IWorkScheduleService } from 'src/app/services/work-schedule/work-schedule.service';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { IUserSupportService } from 'src/app/services/user-support/user-support.service';
import { KnowledgeBaseArticle } from 'src/app/models/KnowledgeBaseArticle';
import { ApiService } from 'src/app/services/api.service';
import { IBrowserNavigationService } from 'src/app/services/browser-navigation/browser-navigation.service';
import { IMarketingService } from 'src/app/services/marketing/marketing.service';

@Component({
  selector: 'app-work-settings',
  templateUrl: './work-settings.page.html',
  styleUrls: [
    '../../driversseat-styles.scss',
    './work-settings.page.scss'],
})
export class WorkSettingsPage implements OnInit {

  private readonly _logger: Logger;

  public hasChanges: boolean = false;
  public isSaving: boolean = false;
  public isGhosting: boolean = false;
  public get pushNotificationsDisabled(): boolean {
    return this._user
      ? this._user.opted_out_of_push_notifications
      : true;
  }

  //The UI Values
  public remindShiftStart: boolean;
  public remindShiftEnd: boolean;
  public schedule: any;


  public readonly config: SchedulePickerConfig;

  constructor(
    logSvc: ILogService,
    private readonly _router: Router,
    private readonly _alertCtrl: AlertController,
    private readonly _apiSvc: ApiService,
    private readonly _workScheduleSvc: IWorkScheduleService,
    private readonly _userSvc: UserService,
    private readonly _userSupportSvc: IUserSupportService,
    private readonly _toastCtrl: ToastController,
    private readonly _browserNavSvc: IBrowserNavigationService,
    private readonly _marketingSvc: IMarketingService
  ) {
    this._logger = logSvc.getLogger("WorkSettingsPage");
    this._userSvc.currentUser$.subscribe(u => this.userChanged(u));
    this._workScheduleSvc.workSchedule$.subscribe(ws=>this.scheduleChaged(ws));
    this.config = _workScheduleSvc.config;
  }

  ngOnInit() {
  }

  private _scheduledShifts: ScheduledShift[];
  private _user: User;

  public async ionViewDidEnter() {

    await this._marketingSvc.pause("ShiftReminders")

    this._user = this._userSvc.currentUser;
    this.isGhosting = this._apiSvc.isGhosting;
    this._scheduledShifts = this._workScheduleSvc.workSchedule$.value;

    this.updateUIFromModel();
    this.checkAndWarnUserNotificationsDisabled();
  }

  public async ionViewWillLeave() {
    this._logger.LogDebug("ionViewWillLeave");
    await this._marketingSvc.resume("ShiftReminders");
  }

  checkAndWarnUserNotificationsDisabled() {
    if (!this._user || this._apiSvc.isGhosting) {
      return;
    }

    if (this._user.opted_out_of_push_notifications) {
      this._alertCtrl.create({
        cssClass: "pop-up",
        header: "To receive reminders, you will need to enable push notifications",
        message: "Would you like to enable push notifications?",
        buttons: [
          {
            text: "No thanks",
            role: "cancel"
          },
          {
            text: "Enable",
            handler: (v) => {
              this._userSvc.updatePushNotificationPermission(this._user.id, true);
            }
          }
        ]
      }).then(x => x.present());
    }
  }

  scheduleChaged(s) {
    this._scheduledShifts = s;
    this.isGhosting = this._apiSvc.isGhosting;
    this.updateUIFromModel();
  }

  userChanged(u) {
    this._user = u;
    this.isGhosting = this._apiSvc.isGhosting;
    this.updateUIFromModel();
  }

  updateUIFromModel() {

    if (!this._scheduledShifts || !this._user) {
      return;
    }

    this.schedule = this._workScheduleSvc.getSelectionsFromWorkSchedule(this._scheduledShifts);
    this.remindShiftStart = this._user.remind_shift_start || false;
    this.remindShiftEnd = this._user.remind_shift_end || false;
  }

  undoChanges() {
    this.updateUIFromModel();
  }

  clearSchedule() {
    this.initializeSchedule(false);
  }

  async saveChanges() {

    this._logger.LogInfo("saveChanges", this.schedule, this.remindShiftStart, this.remindShiftEnd);

    if (!this._user || !this.schedule) {
      this.navigateBack();
      return;
    }

    if (this._apiSvc.isGhosting) {
      this._logger.LogWarning("saveChanges", "not saving during ghost session");

      this._toastCtrl.create({
        header: "Changes Not Saved",
        message: "Changes cannot be saved while ghosting another user",
        position: 'bottom',
        duration: 3000,
        cssClass: "pop-up",   //in global.scss
      }).then(x => x.present());

      this.navigateBack(false);
      return;
    }

    const remindStart = this.remindShiftStart;
    const remindEnd = this.remindShiftEnd;
    const shifts = this._workScheduleSvc.getWorkScheduleFromSelections(this.schedule);

    this._userSvc.updateShiftReminderPreferences(this._user.id, remindStart, remindEnd)
      .then(() => {
        this._workScheduleSvc.saveWorkSchedule(shifts)
          .then(() => {
            this.navigateBack(true);
          });
      });
  }

  public navigateBack(showToast: boolean = false) {
    this._browserNavSvc.navigateBack()
      .then((x) => {

        if (showToast) {

          const options: ToastOptions =
          {
            header: "Shift Reminders",
            message: "Your changes have been saved.",
            position: 'bottom',
            duration: 3000,
            cssClass: "pop-up",   //in global.scss
          };

          if (this._user && this._user.opted_out_of_push_notifications &&
            (this._user.remind_shift_start || this._user.remind_shift_end)) {

            options.buttons = [{
              text: "X",
              role: "cancel"
            }];

            options.message += "  But, to receive reminders, update your profile to allow push notificaitons."
            options.duration = 10000;
          }

          this._toastCtrl.create(options).then(x=>x.present());
        }
      });
  }

  public async requestNavBack(event: any) {

    this.isSaving = true;
    this.saveChanges()
      .then(() => {
        this.isSaving = false;
      });
  }

  public getDayText(day: dayOfWeek): string {
    return dayOfWeek[day]?.substring(0, 2).toUpperCase();
  }

  public getHourText(hour: hourOfDay): string {

    let hourDisp = hour % 12;
    if (hourDisp == 0) {
      hourDisp = 12;
    }
    return `${hourDisp}${hour >= 12 ? 'pm' : 'am'}`;
  }

  private initializeSchedule(overwriteValue?: boolean) {

    this.schedule = this.schedule || {};

    if (!this.config || !this.config.availableDays || !this.config.availableHours) {
      return;
    }

    this.config.availableDays.forEach(d => {
      this.schedule[d] = this.schedule[d] || {};
      this.config.availableHours.forEach(h => {
        if (overwriteValue != null) {
          this.schedule[d][h] = overwriteValue;
        } else {
          this.schedule[d][h] = this.schedule[d][h] || false;
        }
      });
    });


    if (this.config.availableDays.length == 0) {
      return;
    }
  }

  public reset() {
    if (this.isGhosting) {
      this._logger.LogInfo("Ignoring Request to Reset because ghosting is enabled");
      return;
    }

    this.initializeSchedule(false);
  }

  public async showHelp() {
    await this._userSupportSvc.openKnowledgeBaseArticle(KnowledgeBaseArticle.ShiftReminders);
  }


  private _mode: "selecting" | "deselecting" | "scrolling" | "clicking" = "scrolling";
  private _selectTimer;
  private _touch_StartX: number;
  private _touch_StartY: number;

  async touchStart(event: any) {

    if (this._selectTimer) {
      clearTimeout(this._selectTimer);
      this._selectTimer = null;
    }

    //If currently saving, do not allow user to make any changes
    if (this.isSaving || this.isGhosting) {
      return;
    }

    const day = event?.target?.attributes["day"]?.value;
    const hour = event.target?.attributes["hour"]?.value;

    if (!day || !hour) {
      return;
    }

    await Haptics.selectionStart();

    const toBeMode = this.schedule[day][hour] == true
      ? 'deselecting'
      : 'selecting';

    //For 1/2 sec, if the user moves, they intend to scroll.
    //Otherwise, change mode to "Selecting/Deselecting" and track
    //their movement.
    this._mode = "clicking";
    this._touch_StartX = event.touches[0].clientX;
    this._touch_StartY = event.touches[0].clientY;

    this._selectTimer = setTimeout(async () => {

      this._mode = toBeMode;
      this._selectTimer = null;
      await Haptics.notification({
        type: NotificationType.Success
      });
      this.handleSelection(day, hour);
    }, 500);
  }

  async handleSelection(day: number, hour: number) {

    if (!day || !hour) {
      return;
    }

    switch (this._mode) {
      case 'clicking':
        this.schedule[day][hour] = !(this.schedule[day][hour]);
        this.hasChanges = true;
        await Haptics.selectionChanged();
        break;

      case 'selecting':
        if (this.schedule[day][hour] == false) {
          this.schedule[day][hour] = true;
          this.hasChanges = true;
          await Haptics.selectionChanged();
        }
        break;

      case 'deselecting':
        if (this.schedule[day][hour] == true) {
          this.schedule[day][hour] = false;
          this.hasChanges = true;
          await Haptics.selectionChanged();
        }
        break;
    }
  }

  async touchEnd(event: any) {

    if (this._mode == "clicking") {
      const elem = event.target;
      const day = elem?.attributes["day"]?.value;
      const hour = elem?.attributes["hour"]?.value;
      this.handleSelection(day, hour);
    }

    this._mode = 'scrolling';

    if (this._selectTimer) {
      clearTimeout(this._selectTimer);
      this._selectTimer = null;
    }

    await Haptics.selectionEnd();
  }

  async touchMove(event: TouchEvent) {

    //If we are in scroll mode, do nothing and let 
    //the default scrolling behavior take over.
    if (this._mode == 'scrolling') {
      return;
    }

    const clientX = event.touches[0].clientX;
    const clientY = event.touches[0].clientY;

    //If in the wait and see period, see how far the user has moved.
    //If a big move, assume that user wants to scroll and cancel the
    //wait and see timer.
    if (this._selectTimer) {

      const diffX = clientX - this._touch_StartX;
      const diffY = clientY - this._touch_StartY;

      //This handles slight drift of user finger on the device.
      if (diffX < 10 && diffX > -10 && diffY < 10 && diffY > -10) {
        return;
      }

      clearTimeout(this._selectTimer);
      this._selectTimer = null;
      this._mode = "scrolling";

      Haptics.selectionEnd();

      return;
    }

    //Prevent scrolling behavior
    event.preventDefault();

    const elem = document.elementFromPoint(clientX, clientY);
    const day = elem?.attributes["day"]?.value;
    const hour = elem?.attributes["hour"]?.value;

    this.handleSelection(day, hour);
  }


}
