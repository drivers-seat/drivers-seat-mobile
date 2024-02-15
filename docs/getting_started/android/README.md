# Setting up the Android Native App

## Prerequisites

* Install [Android Studio](https://developer.android.com/studio)
* Transistorsoft Background Geolocation License Key

## Generate the native app

At the root of your local repo, execute the following which will add an `android` folder with an Android Studio project.

```shell
ionic cap sync
ionic cap add android
```

## Update the [AndroidManifest.xml](/android/app/src/main/AndroidManifest.xml)

* The appId value from [capacitor.config.ts](/capacitor.config.ts)  may not be transferred over to the android:name property.  Verify and/or fix the value.  If the `appId` value in your [capacitor.config.ts](/capacitor.config.ts) is `com.example.app`, the value in your manifest should appear as `com.example.app.MainActivity`
* add attribute `android:screenOrientation="portrait"` to the `<activity>` node
* add attribute `android:usesCleartextTraffic="true"` to the `<application>` node

* Your [AndroidManifest.xml](/android/app/src/main/AndroidManifest.xml) should appear similar to this.

  ```xml
  <?xml version="1.0" encoding="utf-8" ?>
  <manifest xmlns:android="http://schemas.android.com/apk/res/android">
      <application
          android:allowBackup="true"
          android:icon="@mipmap/ic_launcher"
          android:label="@string/app_name"
          android:roundIcon="@mipmap/ic_launcher_round"
          android:supportsRtl="true"
          android:usesCleartextTraffic="true"
          android:theme="@style/AppTheme">

          <activity
              android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
              android:name="[***YOUR APP ID HERE***].MainActivity"
              android:screenOrientation="portrait"
              android:label="@string/title_activity_main"
              android:theme="@style/AppTheme.NoActionBarLaunch"
              android:launchMode="singleTask"
              android:exported="true">
  ```

## Generate App Image Assets
  
* From the root of your local repo, execute the following which will set up the splashscreen and app icon images based on the images that you set up for your project

  ```shell
  npx capacitor-assets generate --android
  ```

* The following images files are capacitor default images and should be removed

  ```shell
  rm android/app/src/main/res/mipmap-hdpi/ic_launcher_foreground.png
  rm android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.png
  rm android/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.png
  rm android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.png
  rm android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png
  ```

* Replace the contents of [android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml](/android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml)

  ```xml
  <?xml version="1.0" encoding="utf-8"?>
  <adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
      <background>
          <inset android:drawable="@color/ic_launcher_background" android:inset="16.7%" />
      </background>
      <foreground>
          <inset android:drawable="@mipmap/ic_launcher_foreground" android:inset="16.7%" />
      </foreground>
  </adaptive-icon>
  ```

* Replace the contents of [android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml](/android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml)

  ```xml
  <?xml version="1.0" encoding="utf-8"?>
  <adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
      <background>
          <inset android:drawable="@color/ic_launcher_background" android:inset="16.7%" />
      </background>
      <foreground>
          <inset android:drawable="@mipmap/ic_launcher_foreground" android:inset="16.7%" />
      </foreground>
  </adaptive-icon>
  ```

## Prevent Back-button behavior

Override the `onBackPressed` method on the `MainActivity` to ignore back-buttons.  Your code should appear similiar to below.

**android/app/src/main/java/{{your app id}}/MainActivity.java** (your AppID is com.example.app)

```java
package com.example.app;      <== THIS IS YOUR APP ID

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onBackPressed() {
    //Completely disable the back button on Android
  }
}
```


## Configure Background Geolocation Plugin (Transistorsoft)

Adjust the following files

**[android/build.gradle](/android/build.gradle)**

```gradle
// Top-level build file where you can add configuration options common to all sub-projects/modules.
buildscript {
  ...
}

apply from: "variables.gradle"

allprojects {
    repositories {
        google()
        mavenCentral()

        // ADD THESE ENTRIES
        // capacitor-background-geolocation
        // https://github.com/transistorsoft/capacitor-background-geolocation/blob/master/help/INSTALL-ANDROID.md
        maven {
          url("${project(':transistorsoft-capacitor-background-geolocation').projectDir}/libs")
        }
        // capacitor-background-fetch
        // https://github.com/transistorsoft/capacitor-background-fetch/blob/master/help/INSTALL-ANDROID.md
        maven {
          url("${project(':transistorsoft-capacitor-background-fetch').projectDir}/libs")
        }
    }
}
...
```

**[android/app/proguard-rules.pro](/android/app/proguard-rules.pro)**
Add the following entry to the bottom of this file if it does not already exist

```pro
# [capacitor-background-fetch]
-keep class **BackgroundFetchHeadlessTask { *; }
```

**[android/variables.gradle](/android/variables.gradle)**
Add the following entries to the bottom of this file.  Your file should apppear similiar to below.

```gradle
ext {
    minSdkVersion = 22
    compileSdkVersion = 33
    targetSdkVersion = 33
    ...

    // ADD THESE ENTRIES
    // capacitor-background-geolocation variables
    // https://github.com/transistorsoft/capacitor-background-geolocation/blob/master/help/INSTALL-ANDROID.md
    playServicesLocationVersion = '21.0.1'
    okHttpVersion = '4.9.1'
    localBroadcastManagerVersion = '1.0.0'
}
```

**[android/app/build.gradle](/android/app/build.gradle)**

```gradle
apply plugin: 'com.android.application'

// ******************* ADD THESE ENTRIES ****************************
// https://github.com/transistorsoft/capacitor-background-geolocation/blob/master/help/INSTALL-ANDROID.md
Project background_geolocation = project(':transistorsoft-capacitor-background-geolocation')
apply from: "${background_geolocation.projectDir}/app.gradle"
// ******************************************************************

android {
  ...
  buildTypes {
    release {
      minifyEnabled false
      proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
      // ******************* ADD THESE ENTRIES ****************************
      // [background-geolocation] Proguard-rules
      proguardFiles "${background_geolocation.projectDir}/proguard-rules.pro"
      // ******************************************************************
    }
  }
}
...
```

**[android/app/src/main/AndroidManifest.xml](/android/app/src/main/AndroidManifest.xml)**
Add the license key information here.

```xml
<?xml version="1.0" encoding="utf-8" ?>
<manifest ...>
  <application ...>
    <activity ...>
      ...
    </activity>
  
    <!-- **************************************************************** -->
    <!-- ADD YOUR LICENSE KEY HERE -->    
    <!-- capacitor-background-geolocation licence key -->
    <meta-data android:name="com.transistorsoft.locationmanager.license" android:value="[[YOUR_LICENCE_KEY_HERE]]" />
    <!-- **************************************************************** -->

    <provider>
    ...
    </provider>
  </application>

  <!-- Permissions -->
  <uses-permission android:name="android.permission.INTERNET" />
</manifest>
```

* Here's the [transistorsoft docs](https://github.com/transistorsoft/capacitor-background-geolocation/blob/master/help/INSTALL-ANDROID.md) for reference.
* Compare your setup to this [Sample Angular app](https://github.com/transistorsoft/capacitor-background-geolocation/tree/master/example/angular/android).

## Configure OneSignal

* [Set up Google Firebase Cloud Messaging API Credentials](https://documentation.onesignal.com/docs/generate-firebase-credentials)
* Download the `google-services.json` file from the Firebase console and place it in the `/android/app` folder.
  * Confirm correct placement by following [this link](/android/app/google-services.json) which will open the file.
* Optional: [Customize Notification Icons to your logo](https://documentation.onesignal.com/docs/customize-notification-icons)

## Testing

* Rebuild the application, reflecting any configuration changes you have made in `environment.ts` or `capacitor.config.ts`

  ```shell
  ionic cap sync android
  ionic cap build android --configuration=local-android  #or your environment name
  ```

* Verify your custom images are placed
* Verify your org name appears on the splash screen
* It should ask you if you'd like to receive push notifications
* Location Tracking should be turned off initially
  * Configure it in settings
  * Set your simulator to highway drive
  * Track your location