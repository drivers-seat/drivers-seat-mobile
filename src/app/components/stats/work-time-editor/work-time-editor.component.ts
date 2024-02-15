import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Haptics, NotificationType } from '@capacitor/haptics';
import { StatusBar } from '@capacitor/status-bar';
import { IonContent, LoadingController, ToastController } from '@ionic/angular';
import { addDays, addHours, addMinutes, fromUnixTime, getMinutes, getUnixTime, startOfHour } from 'date-fns';
import { TimeHelper } from 'src/app/helpers/TimeHelper';
import { KnowledgeBaseArticle } from 'src/app/models/KnowledgeBaseArticle';
import { Timespan } from 'src/app/models/Timespan';
import { TimespanAllocation } from 'src/app/models/TimespanAllocation';
import { ApiService } from 'src/app/services/api.service';
import { IDeviceService } from 'src/app/services/device/device.service';
import { IEarningsService } from 'src/app/services/earnings/earnings.service';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import { IModalService } from 'src/app/services/modal/modal.service';
import { IUserSupportService } from 'src/app/services/user-support/user-support.service';


enum workStatus {
  engaged = "engaged",
  notEngaged = "notEngaged",
  free = "free"
}

@Component({
  selector: 'app-work-time-editor',
  templateUrl: './work-time-editor.component.html',
  styleUrls: [
    '../stats.scss',
    './work-time-editor.component.scss'
  ],
})
export class WorkTimeEditorComponent implements OnInit {

  private readonly _logger: Logger;

  public work_date: Date;

  public timespans: Timespan[];
  public allocations: TimespanAllocation[];
  public workAllocations: TimespanAllocation[];
  public engagedDurationSeconds: number;
  public notEngagedDurationSeconds: number;
  public notEngagedDurationSeconds_original: number;
  public workStatuses: any[];

  public work_date_start: Date;
  public work_date_start_unix: number;
  public work_date_end: Date;
  public work_date_end_unix: number;

  public get canEdit(): boolean {
    return !this._apiSvc.isGhosting;
  }

  private readonly block_size_minutes = 5;
  private readonly block_size_seconds = this.block_size_minutes * 60;

  public TimeHelper: TimeHelper = TimeHelper.Instance;

  @ViewChild(IonContent, { static: false }) content: IonContent;
  @ViewChild('firstWorkTime',{ static: false}) firstBlock: ElementRef;
  
  constructor(
    logSvc: ILogService,
    private readonly _deviceSvc: IDeviceService,
    private readonly _earningsSvc: IEarningsService,
    private readonly _modalSvc: IModalService,
    private readonly _spinnerCtrl: LoadingController,
    private readonly _toastCtrl: ToastController,
    private readonly _apiSvc: ApiService,
    private readonly _userSupportSvc: IUserSupportService
  ) {
    this._logger = logSvc.getLogger("WorkTimeEditorComponent");
  }

  public async ionViewWillEnter() {
    this._logger.LogDebug("ionViewDidEnter");

    if (!this._deviceSvc.is_Web) {
      await StatusBar.hide()
    }
  }

  public async ionViewWillLeave() {
    this._logger.LogDebug("ionViewDidEnter");

    if (!this._deviceSvc.is_Web) {
      await StatusBar.show();
    }
  }


  public async ionViewDidEnter() {

    this._logger.LogDebug("ionViewDidEnter");
    
    this.timespans = null;
    this.allocations = null;
    this.workAllocations = null;
    this.workStatuses = null;

    const timespansResult = await this._earningsSvc.get_timespans_for_workday(this.work_date);
    if(timespansResult.work_date != this.work_date){
      return;
    }

    this.timespans = timespansResult.timespans;
    this.allocations = this.timespans.flatMap(ts => ts.allocations);
    this.workAllocations = this.allocations.filter(a => a.activity_id);

    let work_date_start = addHours(this.work_date, 4);
    let work_date_start_unix = getUnixTime(work_date_start);
    let work_date_end = addDays(work_date_start, 1);
    let work_date_end_unix = getUnixTime(work_date_end);
    
    const allocTimes = this.allocations
      .filter(a=>a.start_time_unix)
      .map(a=>a.start_time_unix)

    allocTimes.push(...this.allocations
    .filter(a=>a.end_time_unix)
    .map(a=>a.end_time_unix));

    work_date_start_unix = Math.min(...allocTimes, work_date_start_unix);
    work_date_end_unix = Math.max(...allocTimes, work_date_end_unix);

    this.work_date_start = startOfHour(fromUnixTime(work_date_start_unix));
    this.work_date_end = addHours(startOfHour(fromUnixTime(work_date_end_unix)),1);
    this.work_date_start_unix = getUnixTime(this.work_date_start);
    this.work_date_end_unix = getUnixTime(this.work_date_end);

    this.engagedDurationSeconds = this.workAllocations.reduce((total, alloc) => { return total + alloc.duration_seconds; }, 0);

    this.workStatuses = this.extractWorkTimesFromAllocations();

    this.updateNonEngagedDuration();

    this.notEngagedDurationSeconds_original = this.notEngagedDurationSeconds;
    
    setTimeout(async () => {
      await this.scrollToFirstNonEngagedTime();  
    }, 250);
  }

  public get durationDeltaText(): string {

    if (this.notEngagedDurationSeconds == this.notEngagedDurationSeconds_original) {
      return "no changes";
    }

    const delta = Math.abs(this.notEngagedDurationSeconds - this.notEngagedDurationSeconds_original);
    return this.notEngagedDurationSeconds > this.notEngagedDurationSeconds_original
      ? `add ${TimeHelper.getDurationFromSeconds(delta)}`
      : `remove ${TimeHelper.getDurationFromSeconds(delta)}`
  }

  public onRemoveNonEngagedBlocksClick(minDurationMinutes: number){

    if (!this.canEdit) {
      this._logger.LogInfo("Igoring request during ghost");
      return;
    }

    this._logger.LogDebug("onRemoveNonEngagedBlocksClick", minDurationMinutes);

    const emptySlots = this.workStatuses.reduce((slots, x)=>{

      if(x.status == workStatus.notEngaged){
        slots.push(x);
        return slots;
      }

      //otherwise it's engaged, check to see if there are x minutes of non-engaged time in a row.
      if ((slots.length * this.block_size_minutes) >= minDurationMinutes) {
        slots.forEach(s => s.status = workStatus.free);
      }

      return [];

    },[]);


    if ((emptySlots.length * this.block_size_minutes) >= minDurationMinutes) {
      emptySlots.forEach(s => s.status = workStatus.free);
    }

    this.updateNonEngagedDuration();
  }

  public async showHelp(){
    await this._userSupportSvc.openKnowledgeBaseArticle(KnowledgeBaseArticle.WorkTimeEditor);
  }

  public onCancel() {
    this._modalSvc.dismiss(false);
  }

  public async onSave() {

    if (!this.canEdit) {
      this._logger.LogInfo("Igoring request during ghost");
      return;
    }

    //check if any changes were made
    if (!this.workStatuses.some(x=> x.status != x.original_status)){
      this.onCancel();
      return;
    }


    const spinner = await this._spinnerCtrl.create({
      message: "Saving Changes..."
    });

    await spinner.present()

    const shifts = [];
    let currentShift = null;
    for (var i = 0; i < this.workStatuses.length; i++) {

      if (this.workStatuses[i].status != workStatus.free) {

        if (currentShift) {
          continue;
        }

        currentShift = {
          start_time: addMinutes(this.work_date_start, (i * this.block_size_minutes)),
          end_time: null
        };

        shifts.push(currentShift)

        continue;
      }

      if (!currentShift) {
        continue;
      }

      currentShift.end_time = addMinutes(this.work_date_start, (i * this.block_size_minutes));
      currentShift = null;
    }

    if (currentShift && !currentShift.end_time) {
      currentShift.end_time = this.work_date_end;
    }

    this._logger.LogDebug("onSave", shifts);
    await this._earningsSvc.update_working_times(this.work_date, shifts);

    this._modalSvc.dismiss(true);
    await spinner.dismiss()
    const toast = await this._toastCtrl.create({
      message: "Your work time changes have been saved",
      cssClass: "pop-up",
      duration: 5000
    });
    toast.present();
  }

  public getTimeLabel(slot): string {
    const min = getMinutes(slot.start_time);
    return (min == 0 || min == 15 || min == 30 || min == 45)
      ? TimeHelper.toShortTime(slot.start_time)
      : "";
  }

  public getSlot(i) {
    return i < 0
      ? null
      : this.workStatuses[i];
  }

  private async scrollToFirstNonEngagedTime() {

    if(!this.firstBlock?.nativeElement){
      return;
    }
    
    if(!this.content){
      return;
    }

    if(this.firstBlock.nativeElement.offsetTop < 100){
      return;
    }

    await this.content.scrollByPoint(0, this.firstBlock.nativeElement.offsetTop-100, 1000);
  }

  private updateNonEngagedDuration() {
    this.notEngagedDurationSeconds = this.workStatuses.reduce((total, slot) => {
      return slot.status == workStatus.notEngaged
        ? total + this.block_size_seconds
        : total;
    }, 0);
  }

  private extractWorkTimesFromAllocations(): Array<workStatus> {

    const work_times = [];

    let d = this.work_date_start
    while (d < this.work_date_end) {

      work_times.push({
        id: `slot${getUnixTime(d)}`,
        start_time: d,
        start_time_unix: getUnixTime(d),
        status: workStatus.free,
        original_status: workStatus.free,
        isFirst: false
      });

      d = addMinutes(d, this.block_size_minutes);
    }

    this.allocations.forEach(a => {

      const startIdx = Math.floor((a.start_time_unix - this.work_date_start_unix) / this.block_size_seconds);
      const endIdx = Math.ceil((a.end_time_unix - this.work_date_start_unix) / this.block_size_seconds);

      for (let idx = startIdx; idx < endIdx; idx++) {

        if (work_times[idx].status == workStatus.engaged) {
          continue;
        }

        if (a.activity_id) {
          work_times[idx].status = workStatus.engaged;
          work_times[idx].original_status = workStatus.engaged;
          continue;
        }

        work_times[idx].status = workStatus.notEngaged;
        work_times[idx].original_status = workStatus.notEngaged;
      }
    });


    const first = work_times.find(x=>x.status != workStatus.free);
    if(first){
      first.isFirst = true;
    }

    return work_times;
  }

  ngOnInit() { }

  //----------
  private _mode: "selecting" | "deselecting" | "scrolling" | "clicking" = "scrolling";
  private _selectTimer;
  private _touch_StartX: number;
  private _touch_StartY: number;

  async touchStart(event: any) {

    if (!this.canEdit) {
      return;
    }

    if (this._selectTimer) {
      clearTimeout(this._selectTimer);
      this._selectTimer = null;
    }

    const idx = event?.target?.attributes["idx"]?.value;

    if (!idx || idx < 0) {
      return;
    }

    await Haptics.selectionStart();

    const toBeMode = this.workStatuses[idx].status == workStatus.free
      ? 'selecting'
      : 'deselecting';

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
      this.handleSelection(idx);
    }, 500);
  }

  public hasChanges: boolean;
  private async handleSelection(idx: number) {

    if (!idx || idx < 0 || !this.canEdit) {
      return;
    }

    switch (this._mode) {
      case 'clicking':
        if (this.workStatuses[idx].status == workStatus.free) {
          this.workStatuses[idx].status = workStatus.notEngaged;
          this.hasChanges = true;
        } else if (this.workStatuses[idx].status == workStatus.notEngaged) {
          this.workStatuses[idx].status = workStatus.free;
          this.hasChanges = true;
        }
        await Haptics.selectionChanged();
        break;

      case 'selecting':
        if (this.workStatuses[idx].status == workStatus.free) {
          this.workStatuses[idx].status = workStatus.notEngaged;
          this.hasChanges = true;
          await Haptics.selectionChanged();
        }
        break;

      case 'deselecting':
        if (this.workStatuses[idx].status == workStatus.notEngaged) {
          this.workStatuses[idx].status = workStatus.free;
          this.hasChanges = true;
          await Haptics.selectionChanged();
        }
        break;
    }

    this.updateNonEngagedDuration();
  }

  async touchEnd(event: any) {

    if (!this.canEdit) {
      return;
    }

    if (this._mode == "clicking") {
      const elem = event.target;
      const idx = elem?.attributes["idx"]?.value;
      this.handleSelection(idx);
    }

    this._mode = 'scrolling';

    if (this._selectTimer) {
      clearTimeout(this._selectTimer);
      this._selectTimer = null;
    }

    await Haptics.selectionEnd();
  }

  async touchMove(event: TouchEvent) {

    if (!this.canEdit) {
      return;
    }

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
    const idx = elem?.attributes["idx"]?.value;

    this.handleSelection(idx);
  }
}