# Hackathon PPT Structure

1. Problem: offline identity verification in zero-network highway zones.
2. Solution: edge AI face recognition with passive and active liveness.
3. Architecture: camera to decision engine pipeline.
4. Offline database: SQLite plus FAISS vector search.
5. Anti-spoofing: MiniFASNet, texture checks, challenge-response.
6. Mobile optimization: INT8 TFLite, pruning, model size budget.
7. Security: local-only storage, replay prevention, confidence scoring.
8. Demo flow: register user, verify user, reject photo/replay spoof.
9. Benchmarks: target <100 ms detection and <1 second verification.
10. Roadmap: SQLCipher, hardware acceleration, larger liveness training set.

## Demo Script

- Launch the Flutter app in airplane mode.
- Register a user face.
- Verify the same user with randomized liveness challenge.
- Try printed photo or phone replay and show rejection reasons.
- Show FPS, RAM, and offline database files.
