# Preparing for Release

## Identify your Version and Build Number

* The Major Version is displayed on the title screen and various parts of the app.
* The Major Version is sent as an HTTP header with every API request
  * See [interceptor.ts](../../src/app/services/interceptor.ts) for more information.
  * Note that the API server may impose minimium version requirements.
* The BuildId should always increase.  It corresponds to the Android Build Number.

## Review/Verify Environment Settings

Verify the various settings, license keys, and logging levels in these files.  They are build-time settings and cannot be changed after deployment

* [environment.prod.ts](../../src/environments/environment.prod.ts)
* [environment.test.ts](../../src/environments/environment.test.ts)

## Set the version information

* Update [environmentBase.ts](../../src/environments/environmentBase.ts)

  ```ts
  export const environmentBase = {
    appDisplayName: "[[YOUR APP NAME]]",
    orgDisplayName: "[[YOUR ORG NAME]]",
    versionId: "4.0.1",             <== CHANGE THIS VALUE
    buildId: "207"                  <== CHANGE THIS VALUE
  }
  ```

* Update iOS Project ([project.pbxproj](../../ios/App/App.xcodeproj/project.pbxproj))
  Find and replace the following values.  Both settings will need to be changed at least 2-times.
  ```pbxproj
  MARKETING_VERSION = 4.0.1;        <== CHANGE THIS VALUE
  CURRENT_PROJECT_VERSION = 207;    <== CHANGE THIS VALUE
  ```



* Update Android Project ([/android/app/build.gradle](../../android/app/build.gradle))

  ```gradle
  apply plugin: 'com.android.application'

  android {
      namespace "com.example.app"
      compileSdkVersion rootProject.ext.compileSdkVersion
      defaultConfig {
          applicationId "com.example.app"
          minSdkVersion rootProject.ext.minSdkVersion
          targetSdkVersion rootProject.ext.targetSdkVersion
          versionCode 207           <== CHANGE THIS VALUE
          versionName "4.0.1"       <== CHANGE THIS VALUE
          ...
  ```

## Make sure packages are up-to-date

```shell
npm i
ionic cap sync
```

## Perform Native Deploys

* [iOS Deployment Guide](ios/README.md)
* [Android Deployment Guide](android/README.md)


## Increment the Version and/or Build Number for the next cycle.
