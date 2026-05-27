from __future__ import annotations

import base64

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


app = FastAPI(title="Offline Face System API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5055", "http://127.0.0.1:5055"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
pipeline = None
tracker = None


class ImageRequest(BaseModel):
    image_b64: str
    user_id: str | None = None
    name: str | None = None


def decode_image(image_b64: str):
    import cv2
    import numpy as np

    raw = base64.b64decode(image_b64.split(",")[-1])
    data = np.frombuffer(raw, dtype=np.uint8)
    image = cv2.imdecode(data, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("invalid_image")
    return image


def get_pipeline():
    global pipeline
    if pipeline is None:
        from backend.core.pipeline import OfflineFacePipeline

        pipeline = OfflineFacePipeline()
    return pipeline


def get_tracker():
    global tracker
    if tracker is None:
        from backend.config.settings import settings
        from recognition.mediapipe_tracker import MediaPipeFaceTracker

        tracker = MediaPipeFaceTracker(settings.detector_model, settings.detection_confidence)
    return tracker


@app.post("/register")
def register(req: ImageRequest):
    return get_pipeline().register(decode_image(req.image_b64), req.user_id or "unknown", req.name or "Unknown")


@app.post("/verify")
def verify(req: ImageRequest):
    return get_pipeline().verify(decode_image(req.image_b64))


@app.get("/health")
def health():
    from backend.config.settings import settings

    return {
        "ok": True,
        "product": "Datalake 3.0 Offline Facial Authentication",
        "detector": "lazy_mediapipe_facemesh_or_opencv_fallback",
        "recognition": "mobilefacenet_onnx",
        "liveness": "blink_headpose_minifasnet",
        "model_path": str(settings.detector_model),
        "model_loaded": settings.detector_model.exists(),
        "offline": True,
    }


@app.post("/detect")
def detect(req: ImageRequest):
    image = decode_image(req.image_b64)
    result = get_tracker().track(image)
    return {
        "backend": "offline_local",
        "model": result.backend,
        "width": int(image.shape[1]),
        "height": int(image.shape[0]),
        "detections": [
            {
                "bbox": list(map(int, detection.bbox)),
                "score": float(detection.score),
                "landmarks": detection.landmarks.astype(float).tolist(),
            }
            for detection in result.detections
        ],
        "mesh_points": int(result.mesh_landmarks[0].shape[0]) if result.mesh_landmarks else 0,
    }


@app.post("/datalake/v3/authenticate")
def datalake_authenticate(req: ImageRequest):
    result = get_pipeline().verify(decode_image(req.image_b64))
    return {
        "datalake_version": "3.0",
        "offline": True,
        "decision": "accepted" if result.get("accepted") else "rejected",
        "confidence": result.get("confidence", 0.0),
        "user_id": result.get("user_id"),
        "reason_codes": result.get("reasons") or [result.get("reason", "pending")],
        "latency_target_ms": 1000,
    }


@app.post("/datalake/v3/enroll")
def datalake_enroll(req: ImageRequest):
    result = get_pipeline().register(decode_image(req.image_b64), req.user_id or "unknown", req.name or "Unknown")
    return {"datalake_version": "3.0", "offline": True, **result}
