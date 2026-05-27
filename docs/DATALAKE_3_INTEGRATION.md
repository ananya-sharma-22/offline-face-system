# Datalake 3.0 Integration

## Goal

Run facial authentication fully offline in zero-network zones with fast face tracking, encrypted local embeddings, hybrid liveness, and local-only APIs.

## Pipeline

Camera frame -> MediaPipe Face Detection -> FaceMesh landmarks -> alignment -> MiniFASNet passive liveness -> blink/head movement active liveness -> MobileFaceNet embedding -> FAISS cosine match -> decision engine.

## Local APIs

### Health

`GET http://localhost:8080/health`

Returns detector backend, offline mode, recognition model, and liveness stack.

### Detection

`POST http://localhost:8080/detect`

Body:

```json
{"image_b64": "data:image/jpeg;base64,..."}
```

### Authentication

`POST http://localhost:8080/datalake/v3/authenticate`

Returns:

```json
{
  "datalake_version": "3.0",
  "offline": true,
  "decision": "accepted",
  "confidence": 0.91,
  "user_id": "DL3-ID-004",
  "reason_codes": ["natural_texture"],
  "latency_target_ms": 1000
}
```

### Enrollment

`POST http://localhost:8080/datalake/v3/enroll`

Stores encrypted embeddings only. Raw face images are not persisted.

## Optimization Plan

- Run MediaPipe tracking every frame and MobileFaceNet every Nth stable frame.
- Use frame skipping during motion blur or low-quality frames.
- Export MobileFaceNet and MiniFASNet to ONNX and TFLite INT8.
- Keep embedding vectors normalized for FAISS inner-product search.
- Require multi-frame consensus before authentication acceptance.
- Store only encrypted embeddings in SQLite.
