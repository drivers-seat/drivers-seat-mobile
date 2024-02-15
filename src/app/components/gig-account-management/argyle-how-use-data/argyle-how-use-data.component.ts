import { Component, OnInit } from '@angular/core';
import { IModalService } from 'src/app/services/modal/modal.service';

@Component({
  selector: 'argyle-how-use-data',
  templateUrl: './argyle-how-use-data.component.html',
  styleUrls: [
    '../../../driversseat-styles.scss',
    './argyle-how-use-data.component.scss'],
})
export class ArgyleHowUseDataComponent implements OnInit {

  constructor(
    private readonly _modalSvc : IModalService
  ) { }

  ngOnInit() {}

  close(){
    this._modalSvc.dismiss();
  }

}
