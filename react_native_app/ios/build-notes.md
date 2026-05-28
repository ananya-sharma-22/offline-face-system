# iOS Build Notes

Target constraints:

- Minimum OS: iOS 12.0.
- Minimum RAM: 3GB-class devices.
- No GPU requirement.
- Camera permission required.
- Network access only for delayed sync after offline verification.

Recommended generated React Native Podfile setting:

```ruby
platform :ios, '12.0'
```

Required `Info.plist` camera message:

```xml
<key>NSCameraUsageDescription</key>
<string>NHAI offline face authentication needs camera access for local liveness and identity verification.</string>
```

Use TFLite INT8 assets in the app bundle. Do not call cloud APIs during inference.
