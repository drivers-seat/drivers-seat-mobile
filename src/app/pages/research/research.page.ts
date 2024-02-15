import { Component, OnInit } from '@angular/core';
import { AlertController, MenuController } from '@ionic/angular';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { UserService } from '../../services/user.service';
import * as moment from 'moment';
import { UserTrackingService } from 'src/app/services/user-tracking/user-tracking.service';
import { TrackedEvent } from 'src/app/models/TrackedEvent';
import { IDeviceService } from 'src/app/services/device/device.service';
import { IBrowserNavigationService } from 'src/app/services/browser-navigation/browser-navigation.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-research',
  templateUrl: './research.page.html',
  styleUrls: ['./research.page.scss'],
})
export class ResearchPage {
  public user;
  public focusGroup: string;
  public confirmCode: string;
  public backendDescription;
  public belongsToGroup: boolean = false;

  public errorMessage: string = "Your code invalid. Please try again.";

  public showDetails: boolean = false;
  public showErrorMessage: boolean = false;
  public showResearhGroupInfo: boolean = false;
  checkedBox: boolean = false;

  public get is_iOS():boolean{
    return this._deviceSvc.is_iOS;
  }
  
  public get appDisplayName(): string { return environment.appDisplayName; }

  constructor(public alertCtrl: AlertController, public userService: UserService, public apiService: ApiService,
    public router: Router, public menuController: MenuController,
    private readonly _deviceSvc: IDeviceService,
    private readonly _userTrackingSvc: UserTrackingService,
    private readonly _browserNavSvc: IBrowserNavigationService
  ) {}

  ionViewWillEnter() {
    this.user = this.userService.currentUser;

    // See if the user is already part of a focus group
    if (this.user && this.user.focus_group && this.user.focus_group !== 'none' && !this.user.unenrolled_research_at) {
      this.confirmCode = this.user.focus_group;
      this.belongsToGroup = true;
      this.validateFocusGroup();
    }
  }

  toggleMenu() {
    this.menuController.enable(true, 'shiftOnRightMenuContentId')
      .then(() =>this.menuController.open('shiftOnRightMenuContentId'));
  }

  setFocusGroup(value: string) {
    console.log(value)
    this.focusGroup = value;

    if (this.focusGroup == "false") {
      this.continue();
    } else if (this.focusGroup == undefined) {
      this.toggleView();
    }
  }

  continue() {
    let confirmed = false;
    let focusGroupName = "";

    if ((this.focusGroup === 'true') && (this.confirmCode !== undefined)) {
      this.validateFocusGroup();
    } else {
      this.toggleView();
    }
  }

  public validateFocusGroup() {
    this.confirmCode = this.confirmCode.toLowerCase();
    this.userService.getResearchGroupInfo(this.confirmCode)
    .then(groupInfo => {
        this.backendDescription = groupInfo;
        // if (this.user && this.user.focus_group && this.user.focus_group !== 'none') {
        //   this.showResearhGroupInfo = false;
        // } else {
          this.showResearhGroupInfo = true;
        // }
      }
    ).catch(err => {
      this.showErrorMessage = true;
    });
  }

  proceed(){
    // Save the code
    this.apiService.focusGroup = this.confirmCode;
    this.user.focus_group = this.confirmCode;
    this.user.enrolled_research_at = moment().format();
    this.user.unenrolled_research_at = null;


    // Check if user is signed in
    if (!this.apiService.isRegistering) {
      // If yes, save the user and return to dashboard
      this.userService.updateUser(this.user, false)
      .then(user => {
        this.user = user;
        this.showResearhGroupInfo = false;
        this.belongsToGroup = true;

        this._userTrackingSvc.captureEvent(TrackedEvent.research_group_enroll, { focus_group : this.user.focus_group });
      });
    } else {
      // If no, return to register
      this.userService.updateUser(this.user)
      .then(user => {
        this._userTrackingSvc.captureEvent(TrackedEvent.research_group_enroll, { focus_group : this.user.focus_group });
        this.user = user;
        this.belongsToGroup = true;
        this.router.navigateByUrl('onboarding');
      });
    }
  }

  unenroll() {

    let focusGroupOld = this.user.focus_group;

    this.confirmCode = null;
    this.apiService.focusGroup = null;
    this.user.unenrolled_research_at = moment().format();
    this.user.focus_group = null;

    this.userService.updateUser(this.user, false)
    .then(user => {

      this._userTrackingSvc.captureEvent(TrackedEvent.research_group_unenroll, { focus_group : focusGroupOld});

      this.user = user;
      this.focusGroup = 'false';
      this.showResearhGroupInfo = false;
      this.belongsToGroup = false;
      // this.showErrorMessage = true;
    });
  }

  get getInputClass(): string{
    let ret: string = "";
    if (this.showErrorMessage){
      ret = "errorClass";
    }

    return ret;
  }

  shouldShowOptions() {
    return this.apiService.authToken() != null &&
           this.belongsToGroup &&
           this.backendDescription != null;
  }

  showRegisterArtifacts() {
    return this.apiService.authToken() == null;
  }

  toggleView() {
    this._browserNavSvc.navigateBack();
  }
}
