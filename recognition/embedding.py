from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np

try:
    import onnxruntime as ort
except Exception:
    ort = None


class FaceEmbedder:
    def __init__(self, model_path: Path | None = None, embedding_dim: int = 128):
        self.embedding_dim = embedding_dim
        self.session = None
        if model_path and model_path.exists() and ort:
            self.session = ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])

    def embed(self, aligned_face_bgr: np.ndarray) -> np.ndarray:
        if self.session:
            return self._embed_onnx(aligned_face_bgr)
        return self._embed_classical(aligned_face_bgr)

    def _embed_onnx(self, aligned_face_bgr: np.ndarray) -> np.ndarray:
        image = cv2.resize(aligned_face_bgr, (112, 112)).astype(np.float32)
        image = (image[..., ::-1] - 127.5) / 128.0
        tensor = image.transpose(2, 0, 1)[None]
        output = self.session.run(None, {self.session.get_inputs()[0].name: tensor})[0][0]
        return self._l2(output.astype(np.float32))

    def _embed_classical(self, aligned_face_bgr: np.ndarray) -> np.ndarray:
        # Offline demo fallback. Replace with MobileFaceNet/ArcFace ONNX for production accuracy.
        gray = cv2.cvtColor(cv2.resize(aligned_face_bgr, (64, 64)), cv2.COLOR_BGR2GRAY)
        hist = cv2.calcHist([gray], [0], None, [self.embedding_dim], [0, 256]).flatten()
        return self._l2(hist.astype(np.float32))

    @staticmethod
    def _l2(vector: np.ndarray) -> np.ndarray:
        return vector / max(np.linalg.norm(vector), 1e-8)


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(a, b) / (max(np.linalg.norm(a), 1e-8) * max(np.linalg.norm(b), 1e-8)))
