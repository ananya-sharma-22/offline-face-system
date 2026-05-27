# Architecture

Camera Feed -> Preprocessing -> MediaPipe Face Detection -> FaceMesh Landmarks -> Alignment -> Passive Liveness -> Active Liveness -> MobileFaceNet Embedding -> FAISS/Encrypted SQLite Matching -> Decision Engine -> Datalake 3.0 Result UI.

## Modules

- `recognition/mediapipe_tracker.py`: optional MediaPipe Face Detection + FaceMesh tracker with CPU fallback.
- `recognition/detection.py`: OpenCV/ONNX-compatible detector fallback for offline demos.
- `recognition/alignment.py`: eye-landmark affine alignment.
- `recognition/embedding.py`: MobileFaceNet/ArcFace ONNX embeddings with cosine similarity.
- `liveness/passive.py`: MiniFASNet ONNX hook plus texture/replay artifact fallback.
- `liveness/active.py`: randomized blink, turn, and smile challenge state machine.
- `database/vector_store.py`: encrypted SQLite identity storage plus FAISS inner-product vector index.
- `backend/core/decision.py`: multi-frame consensus, confidence scoring, and explainable rejection reasons.
- `mobile_app`: Flutter camera UI prepared for on-device TFLite inference.

## Production Model Plan

Use MediaPipe Face Detection + FaceMesh for tracking, MobileFaceNet ArcFace embeddings, and MiniFASNet for anti-spoofing. Convert trained recognition and liveness models from PyTorch to ONNX, then to INT8 TensorFlow Lite for Android. Store only encrypted normalized embeddings locally.
