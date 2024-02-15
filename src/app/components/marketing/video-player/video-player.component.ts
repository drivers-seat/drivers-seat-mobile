import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { getUnixTime } from 'date-fns';
import { IExternalContentService } from 'src/app/services/external-content/external-content.service';
import { ILogService } from 'src/app/services/logging/log.service';
import { Logger } from 'src/app/services/logging/logger';

//Youtube Frame API
declare var YT;

@Component({
  selector: 'video-player',
  templateUrl: './video-player.component.html',
  styleUrls: ['./video-player.component.scss'],
})
export class VideoPlayerComponent implements OnInit {

  private _url: string;
  private _hasInitialized: boolean = false;

  @Input()
  public get url():string {return this._url;}
  public set url(url:string) { 
    if(url != this._url){
      this._url = url;
      if(this._hasInitialized){
        setTimeout(() => {
          this.InitializePlayer(this._url);  
        }, 0);
        
      }
    }
  }

  @ViewChild("videoPlayer")
  private _videoFrame: ElementRef;

  @Output()
  public videoEnd: EventEmitter<Number> = new EventEmitter();

  @Output()
  public videoStart: EventEmitter<void> = new EventEmitter();

  @Output()
  public videoReplay: EventEmitter<void> = new EventEmitter();

  public playerId:string;

  public hasEnded: boolean = false;

  private _startPlayTimeUnix: number = null;

  private readonly _logger: Logger;
  
  private _youtubePlayer: any;


  constructor(
    logSvc: ILogService,
    private readonly _externalContentSvc: IExternalContentService
  ) { 
    this._logger = logSvc.getLogger("VideoPlayerComponent");
  }

  ngAfterViewInit(){
    
    this._hasInitialized = true;

    if(this.url) {
      this.InitializePlayer(this.url);
    }
  }

  ngOnInit() {
  }

  static incrementor:number = 0;

  private getVideoUrl(content_url):string{
    
    content_url = this._externalContentSvc.setQueryParamValue(content_url, "enablejsapi", "1");
    content_url = this._externalContentSvc.setQueryParamValue(content_url, "autoplay", "1");
    content_url = this._externalContentSvc.setQueryParamValue(content_url, "modestbranding", "1");
    content_url = this._externalContentSvc.setQueryParamValue(content_url, "showinfo", "0");
    content_url = this._externalContentSvc.setQueryParamValue(content_url, "color", "blue");
    return content_url;
  }

  private InitializePlayer(content_url: string) {

    if(!content_url){
      return;
    }
  
    content_url = this.getVideoUrl(content_url);

    this._logger.LogDebug("InitializePlayer", content_url);

    if(!this._youtubePlayer){
      this.playerId = `Video${++VideoPlayerComponent.incrementor}`;
      
      this._videoFrame.nativeElement["id"] = this.playerId;
      this._videoFrame.nativeElement["src"] = content_url;

      this._youtubePlayer = new YT.Player(this.playerId, {
        events: {
          'onReady': ()=>this._youtubePlayer?.playVideo(),
          'onStateChange': this.onVideoStateChange.bind(this)
        },
      });
    } else {
      this._youtubePlayer.loadVideoByUrl(content_url);
    }
    
    this.hasEnded = false;
  }

  private onVideoStateChange(event){

    switch(event.data){

      case -1: //unstarted:
        this.handleUnstartedVideo();
        break;

      case 0: //ended
        this.handleEndVideo();
      break;

      case 1: //playing
        this.handleStartVideo();
        break;

      default:
        this._logger.LogDebug("onviewStateChange", event?.data);
        break;
    }
  }

  private handleUnstartedVideo() {

    this._logger.LogDebug("Video Unstarted", this.playerId);
    this.hasEnded = false;
    this._startPlayTimeUnix = null;
  }

  private handleStartVideo() {
    
    this.hasEnded = false;

    if(this._startPlayTimeUnix){
      return;
    }
    this._logger.LogDebug("Video Started", this.playerId);
    this._startPlayTimeUnix = getUnixTime(new Date())
    this.videoStart.emit();
  }

  private handleEndVideo(){
   
    this.hasEnded = true;
    

    if(!this._startPlayTimeUnix){
      this._logger.LogDebug("Video Ended", this.playerId, "duration", "unknown");
      this.videoEnd.emit(null);
    } else {
      const nowUnix = getUnixTime(new Date())
      const duration = nowUnix - this._startPlayTimeUnix;
      this._logger.LogDebug("Video Ended", this.playerId, "duration", duration);
      this._startPlayTimeUnix = null;
      this.videoEnd.emit(duration);
    }
  }
  
  public onReplay(){
    this.videoReplay.emit();
    this.InitializePlayer(this.url);
  }
}
