import { Component, OnInit } from '@angular/core';
import { SafeHtml } from '@angular/platform-browser';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import { IModalService } from 'src/app/services/modal/modal.service';

@Component({
  selector: 'app-public-terms-of-service',
  templateUrl: './public-terms-of-service.component.html',
  styleUrls: [
    '../help.scss',
    './public-terms-of-service.component.scss']
})
export class PublicTermsOfServiceComponent implements OnInit {

  private readonly _logger: Logger;

  public title: SafeHtml;
  public detail: SafeHtml;

  constructor(
    logSvc: ILogService,
    private readonly _modalSvc: IModalService
  ) {
    this._logger = logSvc.getLogger("PublicTermsOfServiceComponent");
  }

  public ngOnInit() {
  }

  public async onCancel() {
    await this._modalSvc.dismiss(null, null, "publicTerms");
  }


}
