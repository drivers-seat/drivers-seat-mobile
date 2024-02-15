// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

import BackgroundGeolocation from "@transistorsoft/capacitor-background-geolocation";
import { LogLevel } from "src/app/services/logging/LogLevel";
import { environmentBase } from "./environmentBase";

export const environment = {
  ...environmentBase,
  ...{
    apiEndpoint: "[[YOUR API ENDPOINT]]",
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
      available: false,
      debug: false,
      logLevel: BackgroundGeolocation.LOG_LEVEL_OFF
    },
    argyle: {
      url: "https://api.argyle.com/v2",
      key: "[[YOUR ARGYLE KEY]]",
      customizationId: "[[OPTIONAL ARGYLE CUSTOMIZATION ID]]"
    },
    oneSignal: {
      appId: null
    }
  }
}