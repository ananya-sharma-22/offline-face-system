from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import cv2

from backend.core.pipeline import OfflineFacePipeline
from recognition.mediapipe_tracker import MediaPipeFaceTracker


@dataclass
class OfflineAuthResult:
    accepted: bool
    confidence: float
    user_id: str | None
    reasons: list[str]
    raw: dict[str, Any]


class NHAIOfflineAuth:
    """Drop-in offline face authentication facade for existing Python apps."""

    def __init__(self, detector_model: str | Path | None = None, confidence: float = 0.65):
        self.pipeline = OfflineFacePipeline()
        self.tracker = MediaPipeFaceTracker(Path(detector_model) if detector_model else None, confidence)

    def detect(self, image_path: str | Path) -> dict[str, Any]:
        frame = self._read_image(image_path)
        result = self.tracker.track(frame)
        return {
            "offline": True,
            "backend": result.backend,
            "detections": [
                {
                    "bbox": detection.bbox,
                    "score": detection.score,
                    "landmarks": detection.landmarks.tolist(),
                }
                for detection in result.detections
            ],
            "mesh_points": int(result.mesh_landmarks[0].shape[0]) if result.mesh_landmarks else 0,
        }

    def enroll(self, image_path: str | Path, user_id: str, name: str) -> dict[str, Any]:
        return self.pipeline.register(self._read_image(image_path), user_id, name)

    def authenticate(self, image_path: str | Path) -> OfflineAuthResult:
        raw = self.pipeline.verify(self._read_image(image_path))
        return OfflineAuthResult(
            accepted=bool(raw.get("accepted")),
            confidence=float(raw.get("confidence", 0.0)),
            user_id=raw.get("user_id"),
            reasons=list(raw.get("reasons") or [raw.get("reason", "pending")]),
            raw=raw,
        )

    @staticmethod
    def _read_image(image_path: str | Path):
        frame = cv2.imread(str(image_path))
        if frame is None:
            raise ValueError(f"Unable to read image: {image_path}")
        return frame
