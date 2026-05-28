# React Native Mandatory Deliverable Mapping

## Compatibility

- Prototype path: `react_native_app/`
- Framework: React Native 0.74 TypeScript.
- Android target: Android 8.0+ / API 26+.
- iOS target: iOS 12+.
- Device class: 3GB RAM, no high-end GPU required.

## Offline Inference

The React Native app is structured around:

- `OfflineFaceEngine`: local enrollment and verification facade.
- `LivenessService`: randomized blink/smile/head-turn challenge plus passive score gate.
- `LocalStore`: local identity and audit queue storage.
- `SyncService`: network-restored sync with purge after successful upload.

Production model runtime should use:

- BlazeFace INT8 TFLite for detection.
- MobileFaceNet INT8 TFLite for 512D embeddings.
- MiniFASNet INT8 TFLite for passive anti-spoofing.

Model budget manifest: `ai_models/mobile_model_manifest.json`.

## Accuracy

The prototype sets a >95% target and includes the threshold/quality hooks needed to calibrate accuracy. Achieving the target requires training and validation using approved datasets covering:

- diverse Indian demographics,
- harsh outdoor sunlight,
- low light,
- shadows,
- toll-plaza and field attendance environments.

## Sync & Purge

`SyncService.syncWhenOnline()`:

1. Checks connectivity using NetInfo.
2. Builds a local sync envelope.
3. POSTs to an AWS-compatible endpoint.
4. Purges local audit logs and marks enrollments synced only after a successful response.

The endpoint is configurable in `SyncService`.

## Open Source

The proposed runtime dependencies are open-source React Native libraries. No paid APIs or cloud inference are required.
