import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ReferralSource, ReferralType } from 'src/app/models/ReferralType';
import { IBrowserNavigationService } from 'src/app/services/browser-navigation/browser-navigation.service';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import { IReferralService } from 'src/app/services/referral/referral.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-generate-referral',
  templateUrl: './generate-referral.component.html',
  styleUrls: [
    '../marketing.scss',
    './generate-referral.component.scss'],
})
export class GenerateReferralComponent implements OnInit {

  private readonly _logger: Logger;
  private _referral_type: ReferralType;
  public referral_source: ReferralSource;

  public get appDisplayName(): string { return environment.appDisplayName; }

  constructor(
    logSvc: ILogService,
    private readonly _routeSvc: ActivatedRoute,
    private readonly _referralSvc: IReferralService,
    private readonly _navSvc: IBrowserNavigationService
  ) { 
    this._logger = logSvc.getLogger("GenerateReferralComponent");

    this._routeSvc.paramMap
      .subscribe(params => {
        this._referral_type = params.get("type") as ReferralType;
        this._logger.LogDebug("referral_type", this._referral_type);
      });
  }

  ngOnInit() {}

  public async ionViewWillEnter() {
    this.referral_source  = await this._referralSvc.GetReferralSourceByType(this._referral_type || ReferralType.FromMenu);
  }

  public async onGenerateSMS(){
    await this._referralSvc.GenerateSMSReferral(this._referral_type);
  }

  public async onClose(){
    await this._navSvc.navigateBack();
  }
}
