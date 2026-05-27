from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np

try:
    import onnxruntime as ort
except Exception:
    ort = None


@dataclass
class FaceDetection:
    bbox: tuple[int, int, int, int]
    score: float
    landmarks: np.ndarray


class FaceDetector:
    def __init__(self, model_path: Path | None = None, confidence: float = 0.65):
        self.confidence = confidence
        self.session = None
        if model_path and model_path.exists() and ort:
            self.session = ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])
        self.fallback = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
        self.fallback_alt = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_alt2.xml")

    def detect(self, frame_bgr: np.ndarray) -> list[FaceDetection]:
        if self.session:
            return self._detect_onnx(frame_bgr)
        return self._detect_fallback(frame_bgr)

    def _detect_onnx(self, frame_bgr: np.ndarray) -> list[FaceDetection]:
        # Production hook: expects a BlazeFace/RetinaFace ONNX model with decoded boxes.
        image = cv2.resize(frame_bgr, (128, 128)).astype(np.float32) / 255.0
        tensor = image[..., ::-1].transpose(2, 0, 1)[None]
        outputs = self.session.run(None, {self.session.get_inputs()[0].name: tensor})
        boxes, scores, landmarks = outputs[:3]
        h, w = frame_bgr.shape[:2]
        detections: list[FaceDetection] = []
        for box, score, lm in zip(boxes[0], scores[0], landmarks[0]):
            if float(score) < self.confidence:
                continue
            x1, y1, x2, y2 = box
            bbox = (int(x1 * w), int(y1 * h), int(x2 * w), int(y2 * h))
            detections.append(FaceDetection(bbox, float(score), lm.reshape(-1, 2) * [w, h]))
        return detections

    def _detect_fallback(self, frame_bgr: np.ndarray) -> list[FaceDetection]:
        gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
        gray = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(gray)
        min_side = max(48, min(frame_bgr.shape[:2]) // 8)
        faces = self.fallback.detectMultiScale(
            gray,
            scaleFactor=1.05,
            minNeighbors=3,
            minSize=(min_side, min_side),
            flags=cv2.CASCADE_SCALE_IMAGE,
        )
        if len(faces) == 0 and not self.fallback_alt.empty():
            faces = self.fallback_alt.detectMultiScale(
                gray,
                scaleFactor=1.05,
                minNeighbors=3,
                minSize=(min_side, min_side),
                flags=cv2.CASCADE_SCALE_IMAGE,
            )
        detections = []
        for x, y, w, h in faces:
            landmarks = np.array([
                [x + 0.33 * w, y + 0.38 * h],
                [x + 0.67 * w, y + 0.38 * h],
                [x + 0.50 * w, y + 0.55 * h],
                [x + 0.38 * w, y + 0.74 * h],
                [x + 0.62 * w, y + 0.74 * h],
            ], dtype=np.float32)
            detections.append(FaceDetection((x, y, x + w, y + h), 0.70, landmarks))
        return detections
