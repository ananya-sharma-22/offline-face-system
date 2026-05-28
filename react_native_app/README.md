# NHAI Offline Face Auth React Native Prototype

Cross-platform React Native prototype for Android 8.0+ and iOS 12+ devices with at least 3GB RAM.

## Goals

- Offline face detection + recognition + active liveness.
- Model budget target: about 20 MB total, with current INT8 target manifest under 7 MB.
- Verification latency target: under 1 second on standard midrange devices.
- Open-source stack only.
- Local queue for enrollments/audit logs.
- Sync to AWS-compatible endpoint when connectivity returns, then purge local audit data.

## Open-Source Runtime Choices

- `react-native-vision-camera` for cross-platform camera frames.
- `react-native-fast-tflite` for on-device TFLite inference.
- `@react-native-async-storage/async-storage` for prototype local storage.
- `@react-native-community/netinfo` for network restore detection.

For production, replace AsyncStorage with encrypted SQLite/SQLCipher and put the INT8 model files in `assets/models/`.

## Run

```bash
cd react_native_app
npm install
npm run android
npm run ios
```

## Add To Existing React Native App

Copy `src/`, install the dependencies from `package.json`, then mount:

```tsx
import { OfflineAuthScreen, OfflineFaceEngine, SyncService } from "./src";

export function AttendanceAuth() {
  return <OfflineAuthScreen />;
}
```

For a custom UI, use `OfflineFaceEngine` directly and keep `SyncService` for sync-and-purge.

## Model Assets

Expected assets:

```text
assets/models/blazeface_short_int8.tflite
assets/models/mobilefacenet_512_int8.tflite
assets/models/minifasnet_int8.tflite
```

The source currently includes deterministic prototype inference hooks so the UI, liveness, storage, and sync flows can be reviewed without bundled model weights.
