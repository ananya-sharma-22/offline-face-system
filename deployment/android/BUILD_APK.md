# Android APK Build

1. Copy optimized `.tflite` models into `mobile_app/assets/models/`.
2. Install Flutter and Android SDK.
3. From `mobile_app`, run `flutter pub get`.
4. Build debug APK: `flutter build apk --debug`.
5. Build release APK: `flutter build apk --release --split-per-abi`.
6. Install offline: `adb install build/app/outputs/flutter-apk/app-arm64-v8a-release.apk`.

Keep all inference local. Do not add network permissions unless a demo-only local API bridge is needed.
