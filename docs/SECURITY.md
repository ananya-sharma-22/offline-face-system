# Security Hardening

- Keep all biometric data offline.
- Store embeddings only, not raw face images.
- Encrypt SQLite on Android with SQLCipher for production.
- Use randomized active liveness to prevent replay scripts.
- Require multi-frame consensus before accepting a user.
- Bind verification attempts to timestamps and frame freshness.
- Apply thresholds per device class using local calibration data.
- Disable network permissions in the release Android manifest.
- Log rejection reasons without storing sensitive frames.
