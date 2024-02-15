import { Component, Input, OnInit } from '@angular/core';
import { LoadingController } from '@ionic/angular';
import { Campaign, CampaignAction, Checklist } from 'src/app/models/Campaign';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';
import { IMarketingService } from 'src/app/services/marketing/marketing.service';


@Component({
  selector: 'campaign-carousel',
  templateUrl: './campaign-carousel.component.html',
  styleUrls: [
    '../marketing.scss',
    './campaign-carousel.component.scss'
  ]
})

export class CampaignCarouselComponent implements OnInit {
  
  private _campaigns : Array<Campaign>;

  @Input()
  public orientation: "horizontal" | "vertical" = "horizontal";


  @Input()
  public get campaigns(): Array<Campaign>{
    return this._campaigns;
  }

  @Input()
  public slides_per_row:number = 1;

  public set campaigns(campaigns: Campaign[]) {
    this._campaigns = campaigns?.filter(c=>c.type == "checklist" || c.preview);
  }

  @Input()
  public display_class:string[];

  private readonly _logger: Logger;

  constructor(
    logSvc: ILogService,
    private readonly _marketingSvc: IMarketingService
  ) { 
    this._logger = logSvc.getLogger("CampaignCarouselComponent");
  }

  ngOnInit() {
    this.slideOpts = {
      direction: this.orientation || "horizontal",
      pager: false,
      loop: false,
      slidesPerView: (this.slides_per_row || 1) + .05,
      spaceBetween: 10
    };
  }

  public slideOpts: any;
  

  public getControlType(item: Campaign): 'checklist' | 'preview' {

    if(item.type == "checklist" && !item.preview){
      return 'checklist';
    }

    return 'preview';
  }

  public async slideInit() {
    // await this.slideChanged();
    // this.slideCount = await this._slides?.length();
    // this.slidex = new Array(this.slideCount);
  }


  public async slideWillChange() {
    //keep this here.  Seems to help make sure the Slide Did change event will fire.
  }

  public async slideChanged() {

    // this.slideIdx = await this._slides?.getActiveIndex();
    // this.isFirstSlide = await this._slides?.isBeginning();
    // this.isLastSlide = await this._slides?.isEnd();


    // const swiper = await this._slides.getSwiper();
    // const slides = swiper.slides;

    // this.slideName = null;

    // if(!slides || slides.length <= this.slideIdx){
    //   return;
    // }

    // const currentSlide = swiper.slides[this.slideIdx];
    
    // if(!currentSlide){
    //   return;
    // }

    // this.slideName = currentSlide["id"];

    // if(!this.slideName){
    //   return;
    // }

    // await this._userTrackSvc.setScreenName(`shifts/help/${this.slideName}`);
  }

  public async gotoSlide(idx) {
    // await this._slides.slideTo(idx);
  }

  public async movePrev() {
    // await this._slides.slidePrev();
  }

  public async moveNext() {
    // await this._slides.slideNext();
  }

  public toChecklist(campaign:Campaign):Checklist {
    return campaign as Checklist;
  }

}
