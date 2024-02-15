import { join } from 'path';
import config from './wdio.shared.appium.config';

// ============
// Capabilities
// ============
//
// For all capabilities please check
// http://appium.io/docs/en/writing-running-appium/caps/#general-capabilities
//
config.capabilities = [
  {
    // The defaults you need to have in your config
    platformName: 'Android',
    maxInstances: 1,
    // For W3C the appium capabilities need to have an extension prefix
    // http://appium.io/docs/en/writing-running-appium/caps/
    // This is `appium:` for all Appium Capabilities which can be found here
    'appium:deviceName': 'Pixel 2 API 32',
    'appium:platformVersion': '12',
    'appium:orientation': 'PORTRAIT',
    'appium:automationName': 'UiAutomator2',
    // The path to the app
    'appium:app': join(process.cwd(), './android/app/build/outputs/apk/debug/app-debug.apk'),
    'appium:appWaitActivity': 'com.rkkn.driversseatcoop2.MainActivity',
    'appium:newCommandTimeout': 240,
    // This will automatically start the iOS app in a webview context,
    // if your app starts in a native context then please put this to false and handle your own
    // context switching
    'appium:autoWebview': true,
    // Read the reset strategies very well, they differ per platform, see
    // http://appium.io/docs/en/writing-running-appium/other/reset-strategies/
    // When enabling the noReset the App will NOT be re-installed between sessions
    // This means that every test needs to maintain it's own state
    // `"appium:noReset":false` means that the app is removed and installed
    // between each test
    'appium:noReset': false,
    // This will prevent appium to restart the app between the sessions,
    // meaning between each spec file
    // @ts-ignore
    'appium:dontStopAppOnReset': false,
    'appium:avd': 'Pixel_2_API_32'
  },
];

exports.config = config;
