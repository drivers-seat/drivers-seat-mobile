import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';

@Component({
  selector: 'hourly-pay-analytics-welcome',
  templateUrl: './hourly-pay-analytics-welcome.component.html',
  styleUrls: [
    '../hourly-pay-analytics.scss',
    './hourly-pay-analytics-welcome.component.scss'],
})
export class HourlyPayAnalyticsWelcomeComponent implements OnInit {

  private readonly _logger: Logger;
  public page: number =  1;

  @Output()
  public onSettingsClick: EventEmitter<void> = new EventEmitter();

  @Output()
  public onHelpClick: EventEmitter<void> = new EventEmitter();

  constructor(
    logSvc: ILogService,
    private readonly _router: Router
  ) {
    this._logger = logSvc.getLogger("HourlyPayAnalyticsWelcomeComponent");
  }

  ngOnInit() { }

  public getStartedClick(){
    this.onSettingsClick.emit();
  }

  public updateGigAccountsClick(){
    this._router.navigateByUrl('gig-accounts');
  }
}
