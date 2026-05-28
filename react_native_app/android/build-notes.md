# Android Build Notes

Target constraints:

- Minimum OS: Android 8.0, API 26.
- Minimum RAM: 3GB.
- No GPU requirement.
- Camera permission required.
- Network permission should be used only for delayed sync; inference is offline.

Recommended `android/app/build.gradle` values in a generated React Native project:

```gradle
android {
  defaultConfig {
    minSdkVersion 26
    targetSdkVersion 35
  }
}
```

Required permissions:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-feature android:name="android.hardware.camera.front" android:required="false" />
```

The app should run inference before any network sync call. Audit/enrollment data is purged after confirmed server sync.
