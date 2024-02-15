import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { format } from 'date-fns';
import { environment } from 'src/environments/environment';
import { IDeviceService } from '../device/device.service';
import { Logger } from "./logger";
import { LogLevel } from './LogLevel';

export abstract class  ILogService{
  abstract getLogger(loggerName: string): Logger;
  abstract setLogLevel(loggerName: string, logLevel: LogLevel);
}

@Injectable({
  providedIn: 'root'
})
export class LogService implements ILogService {

  private readonly _loggingConfig: { level: LogLevel; overrides: {}; };
  private readonly _loggers : Map<string, { logger: Logger, minLogLevel: LogLevel }>; 

  constructor(
    private readonly _platformSvc: Platform
  ) {

    if(environment["logging"]){
      this._loggingConfig = environment["logging"];
    }

    this._loggers = new Map<string, { logger: Logger, minLogLevel: LogLevel }>(); 
  }

  /**
   * Gets a new logger implementation
   */
  getLogger(loggerName: string): Logger {

    if(!this._loggers){
      return;
    }

    loggerName = loggerName || "Logger";

    //Determine if the logger already has been declared
    let logger = this._loggers.get(loggerName);
    if (logger) {
      return logger.logger;
    }

    //Determine the minimum log level from config settings
    let logLevel = LogLevel.INFO;
    if (this._loggingConfig) {
      if (this._loggingConfig.level) {
        logLevel = this._loggingConfig.level;
      }

      if (this._loggingConfig.overrides && this._loggingConfig.overrides[loggerName]) {
        logLevel = this._loggingConfig.overrides[loggerName];
      }
    }

    let loggerInst = new Logger(loggerName, this.Log); 

    //Add logger to cache
    this._loggers.set(loggerName, {
      logger : loggerInst,
      minLogLevel : logLevel
    });
  
    return loggerInst;
  }

  /**
   * Sets an existing logger to a new logging level
   * @param loggerName 
   * @param logLevel 
   */
  setLogLevel(loggerName: string, logLevel: LogLevel): void {
    
    let logger = this._loggers.get(loggerName);
    if(!logger){
      return;
    }
    
    logger.minLogLevel = logLevel;
  }

  private getLevelDisplayName(level : LogLevel)
  {
    switch(level){
      case LogLevel.DEBUG:
        return "debug";
      case LogLevel.VERBOSE:
        return "verbose";
      case LogLevel.INFO:
        return "info";
      case LogLevel.WARNING:
        return "warning";
      case LogLevel.ERROR:
        return "error";
    }
  }

  /**
   * Logger implementation delegate
   * @returns true/false if message was >= the min logging level
   */
  private Log = (loggerName: string, logLevel: LogLevel, ...messages) : boolean => {

    let logger = this._loggers.get(loggerName);
    if(!logger){
      return false;
    }

    const dtm = new Date();
    const dtmDisplay = format(dtm, "yyyy-MM-dd HH:mm:ss");
    const levelName = this.getLevelDisplayName(logLevel)?.toUpperCase();

    //TODO: Add Message to circular cache for potential debug purposes later on
    //Use case - advanced UI that allows someone to send up debug info
    
    if (logLevel < logger.minLogLevel) {
      return false;
    }

    //For android devices, logging does not output objects, so serialize them to JSON
    if (this._platformSvc.is("android") && messages && messages.length > 0) {
      try{
        messages = messages.map(m=>JSON.stringify(m));
      } catch (ex){
        //do our best, but dont fail for logging
      }
    }

    switch (logLevel) {
      case LogLevel.DEBUG:
      case LogLevel.VERBOSE:
        console.debug(dtmDisplay, levelName, loggerName, ...messages);
        break;

      case LogLevel.WARNING:
        console.warn(dtmDisplay, levelName, loggerName, ...messages);
        break;

      case LogLevel.ERROR:
        console.error(dtmDisplay, levelName, loggerName, ...messages);
        break;

      
      case LogLevel.INFO:
      default:
        console.info(dtmDisplay, levelName, loggerName, ...messages);
        break;
    }

    return true;
  }
}
