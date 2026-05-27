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
class PassiveLivenessResult:
    score: float
    passed: bool
    reasons: list[str]
    heatmap: np.ndarray | None = None


class PassiveLivenessDetector:
    def __init__(self, model_path: Path | None = None, threshold: float = 0.72):
        self.threshold = threshold
        self.session = None
        if model_path and model_path.exists() and ort:
            self.session = ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])

    def predict(self, face_bgr: np.ndarray) -> PassiveLivenessResult:
        if self.session:
            score = self._predict_onnx(face_bgr)
            return PassiveLivenessResult(score, score >= self.threshold, self._reasons(score))
        return self._predict_texture(face_bgr)

    def _predict_onnx(self, face_bgr: np.ndarray) -> float:
        image = cv2.resize(face_bgr, (80, 80)).astype(np.float32) / 255.0
        tensor = image[..., ::-1].transpose(2, 0, 1)[None]
        output = self.session.run(None, {self.session.get_inputs()[0].name: tensor})[0]
        return float(np.squeeze(output))

    def _predict_texture(self, face_bgr: np.ndarray) -> PassiveLivenessResult:
        gray = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2GRAY)
        lap_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        hsv = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2HSV)
        saturation = float(hsv[..., 1].mean())
        edges = cv2.Canny(gray, 80, 160)
        moire = float(edges.mean())
        score = np.clip((lap_var / 150.0) * 0.45 + (saturation / 90.0) * 0.25 + (1 - min(moire / 70.0, 1)) * 0.30, 0, 1)
        reasons = self._reasons(float(score))
        heatmap = cv2.applyColorMap(cv2.normalize(edges, None, 0, 255, cv2.NORM_MINMAX), cv2.COLORMAP_JET)
        return PassiveLivenessResult(float(score), float(score) >= self.threshold, reasons, heatmap)

    def _reasons(self, score: float) -> list[str]:
        if score >= self.threshold:
            return ["natural_texture", "no_strong_replay_artifact"]
        return ["possible_flat_texture", "possible_screen_or_print_spoof"]
