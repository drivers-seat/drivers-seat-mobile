import { Component, OnInit } from '@angular/core';
import { Employer } from 'src/app/models/Employer';
import { MetroArea } from 'src/app/models/MetroArea';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import { HourlyPayAnalyticsOptions } from 'src/app/models/HourlyPayAnalyticsOptions';
import { AlertController } from '@ionic/angular';
import { ILookupDataService } from 'src/app/services/lookup-data/lookup-data.service';
import { IPreferenceService } from 'src/app/services/preferences/preferences.service';
import { PreferenceType } from 'src/app/models/PreferenceType';
import { TextHelper } from 'src/app/helpers/TextHelper';
import { IUserSupportService } from 'src/app/services/user-support/user-support.service';
import { UserTrackingService } from 'src/app/services/user-tracking/user-tracking.service';
import { TrackedEvent } from 'src/app/models/TrackedEvent';
import { StatusBar, Style } from '@capacitor/status-bar';
import { IDeviceService } from 'src/app/services/device/device.service';
import { IModalService } from 'src/app/services/modal/modal.service';


interface IUiSelections {
  metro_area: MetroArea,
  service_classes: { [key: string]: boolean },
  service_class_expand: { [key: string]: boolean },
  employers: { [key: string]: { [key: number]: boolean } }
  deduct_mileage: boolean;
  display_value: 'avgHourlyPay' | 'bestEmployerPay',
  highlight_work_schedule: boolean
};

@Component({
  selector: 'hourly-pay-settings',
  templateUrl: './hourly-pay-analytics-settings.component.html',
  styleUrls: [
    '../hourly-pay-analytics.scss',
    './hourly-pay-analytics-settings.component.scss'],
})
export class HourlyPayAnalyticsSettingsComponent implements OnInit {

  private readonly _logger: Logger;

  public messages: Array<string>;

  public svcClasses: string[];
  public employers: Employer[];
  public employersBySvcClass: { [key: string]: Employer[] };
  public metroAreas: MetroArea[];
  public metroAreasById: { [key: number]: MetroArea };
  public isReady: boolean;

  public preventDeductMileage: boolean = false;
  public preventDeductMileageEmployers: string;

  private _employersMap: { [key: number]: Employer; };
  private _allMetroAreas: MetroArea[];
  public selections: IUiSelections;

  public empCols: number = 2;

  constructor(
    logSvc: ILogService,
    private readonly _deviceSvc: IDeviceService,
    private readonly _modalSvc: IModalService,
    private readonly _alertCtrl: AlertController,
    private readonly _lookupDataSvc: ILookupDataService,
    private readonly _preferenceSvc: IPreferenceService,
    private readonly _userSupportSvc: IUserSupportService,
    private readonly _userTrackingSvc: UserTrackingService
  ) {
    this._logger = logSvc.getLogger("HourlyPayAnalyticsSettingsComponent");

    this._lookupDataSvc.isReady$.subscribe(ready => {
      if (!ready) {
        return;
      }

      this._logger.LogInfo("Lookup Data Ready");

      this.employers = this._lookupDataSvc.employers;
      this._employersMap = this._lookupDataSvc.employers_map;
      this.employersBySvcClass = this._lookupDataSvc.employers_service_class_map;
      this.svcClasses = this._lookupDataSvc.service_classes;

      this._allMetroAreas = this._lookupDataSvc.metro_areas;
      this.metroAreasById = this._lookupDataSvc.metro_areas_map;

      this.updateAvailableMetroAreaList();

      this._preferenceSvc.subscribe(PreferenceType.HourlyPayAnalytics, options => {
        this._logger.LogInfo("Preference Value Changed", options);

        this.loadUISelectionsFromOptionsModel(options?.value);
      });
      this.isReady = true;
    });
  }

  ngOnInit() { }

  public async ionViewWillEnter() {
    this._logger.LogDebug("ionViewWillEnter");

    if (!this._deviceSvc.is_Web) {
      await StatusBar.setStyle({
        style: Style.Light
      });
    }
  }

  public async ionViewWillLeave() {
    this._logger.LogDebug("ionViewWillLeave");

  }


  public trySave() {
    this.messages = null;
    const selections = this.selections;
    const options = this.extractOptionsModelFromUISelections(selections);
    this._logger.LogDebug("trySave", selections, options);

    if (!HourlyPayAnalyticsOptions.isValid(options)) {
      this.messages = HourlyPayAnalyticsOptions.validationMessages(options);
      return;
    }

    const wasUpdated = this._preferenceSvc.updatePreferenceValue(PreferenceType.HourlyPayAnalytics, options, false);

    if (wasUpdated) {
      this.trackSettingsChangedEvent(options);
    }

    this._modalSvc.dismiss(true);
  }

  private trackSettingsChangedEvent(options: HourlyPayAnalyticsOptions) {

    const eventData: any = { ...options };

    delete eventData.employer_ids;
    delete eventData.service_classes;
    delete eventData.metro_area_id;

    if (options.employer_ids?.length > 0) {
      eventData.employers = options.employer_ids.map(x => this._employersMap[x] ? this._employersMap[x].name : x).join(", ");
    }

    if (options.service_classes?.length > 0) {
      eventData.service_classes = options.service_classes.join(", ");
    }

    if (options.metro_area_id && this.metroAreasById[options.metro_area_id]) {
      eventData.metro_area = this.metroAreasById[options.metro_area_id].name;
    }

    this._userTrackingSvc.captureEvent(TrackedEvent.hourly_pay_analytics_settings, eventData);
  }

  public onCancel() {
    this.messages = null;
    this._modalSvc.dismiss(false);
  }

  public onMissingMetroClick() {
    this._userSupportSvc.composeMessage("Community Insights", "I want to bring Best Times to Work to my city!");
  }

  public onDisplayValueChange(displayValue: 'avgHourlyPay' | 'bestEmployerPay') {
    this.selections.display_value = displayValue;
  }

  public toggleServiceClass(svcClass) {
    this.setServiceClass(svcClass, !this.selections.service_classes[svcClass]);
  }

  private async setServiceClass(svcClass, value: boolean) {
    this.selections.service_classes = this.selections.service_classes || {};
    this.selections.service_classes[svcClass] = value;

    Object.keys(this.selections.employers[svcClass]).forEach(empId => {
      this.selections.employers[svcClass][empId] = this.selections.service_classes[svcClass];
    });

    this._logger.LogDebug("setServiceClasss", value, this.selections.employers[svcClass]);

    await this.checkForConflictingSelections();
  }

  public toggleExpandServiceClass(svcClass) {
    this.selections.service_class_expand[svcClass] = !(this.selections.service_class_expand[svcClass] || false);
  }

  public getSelectedItemCount(svcClass) {
    let count = 0;
    for (const empId in this.selections.employers[svcClass]) {
      if (this.selections.employers[svcClass][empId] == true) {
        count++;
      }
    }

    return count;
  }

  public getTotalItemCount(svcClass) {
    return Object.keys(this.selections.employers[svcClass]).length;
  }

  public toggleDeductMileage() {
    if (!this.selections.deduct_mileage && this.preventDeductMileage) {
      return;
    }

    this.selections.deduct_mileage = !this.selections.deduct_mileage;
    this.checkForConflictingSelections();
  }

  public toggleEmployer(employer) {
    this.setEmployerImpl(employer, !this.selections.employers[employer.service_class][employer.id]);
  }

  private setEmployerImpl(employer, value: boolean) {
    this.selections.employers = this.selections.employers || {};
    this.selections.employers[employer.service_class] = this.selections.employers[employer.service_class] || {};
    this.selections.employers[employer.service_class][employer.id] = value;
    this.selections.service_classes[employer.service_class] = this.areAllEmployersSelectedForSvcClass(employer.service_class);
    this.checkForConflictingSelections();
  }

  private areAllEmployersSelectedForSvcClass(svcClass): boolean {

    for (const emp in this.selections.employers[svcClass]) {
      if (!(this.selections.employers[svcClass][emp] == true)) {
        return false;
      }
    }

    return true;
  }

  public areNoEmployersSelectedForSvcClass(svcClass): boolean {

    for (const emp in this.selections.employers[svcClass]) {
      if (this.selections.employers[svcClass][emp] == true) {
        return false;
      }
    }

    return true;
  }

  public toggleHighlightWorkSchedule() {
    this.selections.highlight_work_schedule = !this.selections.highlight_work_schedule;
  }

  //Check to make sure selections don't conflict.
  private async checkForConflictingSelections() {

    if (!this.selections) {
      return true;
    }

    const selEmployers = this.extractSelectedEmployersFromUISelections(this.selections);

    const empNamesNoMileage = selEmployers
      .filter(e => !e.reports_mileage)
      .map(e => e.name);

    this.preventDeductMileage = empNamesNoMileage.length > 0
    this.preventDeductMileageEmployers = TextHelper.toFriendlyCsv("and", empNamesNoMileage);

    if (this.selections.deduct_mileage && empNamesNoMileage.length > 0) {

      this.selections.deduct_mileage = false;

      await this._alertCtrl.create({
        header: "Mileage Data Not Available",
        message: `Because mileage is not reported by ${this.preventDeductMileageEmployers}, we have deselected the "Deduct Mileage" option.`,
        cssClass: "pop-up",
        buttons: [
          {
            text: "OK",
            role: "cancel"
          }
        ]
      })
        .then(a => a.present());
    }
  }

  private extractSelectedEmployersFromUISelections(selections: IUiSelections): Array<Employer> {

    const selectedEmpDic: { [key: number]: Employer } = {};

    Object.keys(selections.service_classes).forEach(svcClass => {

      if (selections.service_classes[svcClass] == true) {
        this.employers
          .filter(e => e.service_class == svcClass)
          .forEach(e => selectedEmpDic[e.id] = e);
      }

      Object.keys(selections.employers[svcClass]).forEach(empIdStr => {

        if (selections.employers[svcClass][empIdStr] == true) {
          selectedEmpDic[empIdStr] = this._employersMap[empIdStr];
        }
      });
    });

    return Object.values(selectedEmpDic);
  }

  //Filter metro areas based on data availability, but make sure to include 
  //a metro area if it has been previously selected
  private updateAvailableMetroAreaList() {

    const metroDic: { [key: number]: MetroArea } = {};
    this._allMetroAreas
      .forEach(x => metroDic[x.id] = x);

    this.metroAreas = Object.values(metroDic)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  //Translate from the storage model to the ui model
  private loadUISelectionsFromOptionsModel(options: HourlyPayAnalyticsOptions) {

    this._logger.LogDebug("loadUISelectionsFromOptionsModel", options);

    if (!options) {
      this.initializeSelections(true);
      return;
    }

    this.initializeSelections(false);

    this.selections.metro_area = this.metroAreasById[options.metro_area_id];

    this._logger.LogDebug("loadUISelectionsFromOptionsModel", this.selections.metro_area, this.metroAreasById);
    this.selections.display_value = options.display_value;
    this.selections.deduct_mileage = options.deduct_mileage;
    this.selections.highlight_work_schedule = options.highlight_work_schedule;

    Object.keys(this.selections.service_classes).forEach(svcClass => {

      this.selections.service_class_expand[svcClass] = false;

      //set the service class either way, if it is true, don't bother with employers
      this.setServiceClass(svcClass, options.service_classes?.indexOf(svcClass) >= 0);
      if (options.service_classes?.indexOf(svcClass) >= 0) {
        this._logger.LogDebug("loadUISelectionsFromOptionsModel", svcClass, true);
        return;
      }

      this.employers
        .filter(emp => emp.service_class == svcClass)
        .forEach(emp => {
          this.setEmployerImpl(emp, options.employer_ids?.indexOf(emp.id) >= 0);
        });
    });

    this.checkForConflictingSelections();
  }

  //Translate from UI selections to storage model
  private extractOptionsModelFromUISelections(selections: IUiSelections): HourlyPayAnalyticsOptions {

    const options = new HourlyPayAnalyticsOptions;

    options.metro_area_id = selections.metro_area?.id;
    options.deduct_mileage = selections.deduct_mileage;
    options.highlight_work_schedule = selections.highlight_work_schedule;
    options.display_value = selections.display_value;

    Object.keys(selections.service_classes).forEach(svcClass => {

      if (selections.service_classes[svcClass] == true) {
        options.service_classes = options.service_classes || [];
        options.service_classes.push(svcClass);
        return;
      }

      Object.keys(selections.employers[svcClass]).forEach(empIdStr => {

        if (selections.employers[svcClass][empIdStr] == true) {
          options.employer_ids = options.employer_ids || [];
          options.employer_ids.push(parseInt(empIdStr));
        }
      });
    });

    this._logger.LogDebug("extractSelections", selections, options);
    return options;
  }

  //Initialize an empty set of default values
  private initializeSelections(setDefaults: boolean) {

    this.selections = {
      employers: {},
      service_classes: {},
      service_class_expand: {},
      metro_area: null,
      display_value: 'avgHourlyPay',
      deduct_mileage: false,
      highlight_work_schedule: true
    };

    this.employers.forEach(emp => {
      this.selections.employers[emp.service_class] = this.selections.employers[emp.service_class] || {};
      this.selections.employers[emp.service_class][emp.id] = false;
    })

    this.svcClasses.forEach(svcClass => {
      this.setServiceClass(svcClass, setDefaults);
    });
  }

}
