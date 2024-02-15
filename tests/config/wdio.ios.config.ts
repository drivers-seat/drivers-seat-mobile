import { join } from 'path';
import config from './wdio.shared.appium.config';

config.capabilities = [
  {
    platformName: 'iOS',
    maxInstances: 1,
    'appium:deviceName': 'iPhone 13 mini',
    'appium:platformVersion': '15.5',
    'appium:orientation': 'PORTRAIT',
    'appium:automationName': 'XCUITest',
    'appium:app': join(process.cwd(), './build/Build/Products/Debug-iphonesimulator/App.app'),
    'appium:newCommandTimeout': 240,
    'appium:autoWebview': true,
    'appium:noReset': false
  }
]
config.maxInstances = 1
exports.config = config;
