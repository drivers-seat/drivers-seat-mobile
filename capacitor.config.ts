import { CapacitorConfig } from '@capacitor/cli';
import { environmentBase } from 'src/environments/environmentBase';

const config: CapacitorConfig = {
  appId: "com.example.app",
  appName: "example app",
  webDir: "www",
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#ffffffff",
      showSpinner: true,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#FFFFFF",
      splashFullScreen: true,
      splashImmersive: true
    }
  },
  ios: {
    // from: https://documentation.onesignal.com/docs/ionic-capacitor-cordova-sdk-setup
    handleApplicationNotifications: false
  }
}

export default config;