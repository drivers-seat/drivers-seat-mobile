import BackgroundGeolocation from "@transistorsoft/capacitor-background-geolocation";
import { LogLevel } from "src/app/services/logging/LogLevel";
import { environmentBase } from "./environmentBase";


export const environment = {
  ...environmentBase,
  ...{
    apiEndpoint: "[[API TEST ENDPOINT]]",
    production: true,
    trackEvents: true,
    logging: {
      level: LogLevel.INFO,
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
      debug: false,
      logLevel: BackgroundGeolocation.LOG_LEVEL_WARNING
    },
    argyle: {
      url: "https://api-sandbox.argyle.com/v2",
      key: null,
      customizationId: null
    },
    oneSignal: {
      appId: null
    }
  }
}

