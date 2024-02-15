import BackgroundGeolocation from "@transistorsoft/capacitor-background-geolocation";
import { LogLevel } from "src/app/services/logging/LogLevel";
import { environmentBase } from "./environmentBase";

export const environment = {
  ...environmentBase,
  ...{
    apiEndpoint: "[[API PRODUCTION ENDPOINT]]",
    production: false,
    trackEvents: false,
    logging: {
      level: LogLevel.DEBUG,
      overrides: {
      }
    },
    mixPanel: {
      token: null
    },
    sentry: {
      dsn: null
    },
    backgroundGeolocation: {
      available: true,
      debug: true,
      logLevel: BackgroundGeolocation.LOG_LEVEL_INFO
    },
    argyle: {
      url: "https://api.argyle.com/v2",
      key: null,
      customizationId: null
    },
    oneSignal: {
      appId: null
    }
  }
}

