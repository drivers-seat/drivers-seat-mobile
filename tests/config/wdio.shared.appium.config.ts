import { config } from './wdio.shared.config';

config.port = 4723;
config.baseUrl = "capacitor://localhost/";

config.services = (config.services ? config.services : []).concat([
  [
    'appium',
    {
      command: 'node_modules/.bin/appium',
      args: {
        relaxedSecurity: true,
        address: 'localhost'
      }
    }
  ]
]);

export default config;
