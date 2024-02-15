import { format } from "date-fns";
import { LogLevel } from "./LogLevel";

export class Logger {

  constructor(
    private readonly _loggerName: string,
    private readonly _logMessageDelegate: (loggerName: string, level: LogLevel, ...messages: any) => boolean
  ) {
  }

  Log(loglevel:LogLevel, message:any, ...messages:any) : boolean {
    return this._logMessageDelegate(this._loggerName, loglevel, message, ...messages);
  }

  LogDebug(message: any, ...messages: any): boolean {
    return this._logMessageDelegate(this._loggerName, LogLevel.DEBUG, message, ...messages);
  }

  LogVerbose(message: any, ...messages: any): boolean {
    return this._logMessageDelegate(this._loggerName, LogLevel.VERBOSE, message, ...messages);
  }

  LogInfo(message: any, ...messages: any): boolean {
    return this._logMessageDelegate(this._loggerName, LogLevel.INFO, message, ...messages);
  }

  LogWarning(message: any, ...messages: any): boolean {
    return this._logMessageDelegate(this._loggerName, LogLevel.WARNING, message, ...messages);
  }

  LogError(error: any, ...messages: any): boolean {
    return this._logMessageDelegate(this._loggerName, LogLevel.ERROR, error, ...messages);
  }

  LogCritical(message:any, ...messages:any) : boolean {
    return this._logMessageDelegate(this._loggerName, LogLevel.CRITICAL, message, ...messages);
  }
}
