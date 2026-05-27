from __future__ import annotations

from dataclasses import asdict

import cv2
import numpy as np

from backend.config.settings import settings
from backend.core.decision import DecisionEngine, VerificationFrame
from backend.core.quality import assess_face_quality, enhance_low_light
from database.vector_store import FaceVectorStore
from liveness.active import ActiveLivenessDetector
from liveness.passive import PassiveLivenessDetector
from recognition.alignment import align_face
from recognition.detection import FaceDetector
from recognition.embedding import FaceEmbedder


class OfflineFacePipeline:
    def __init__(self):
        self.detector = FaceDetector(settings.detector_model, settings.detection_confidence)
        self.embedder = FaceEmbedder(settings.recognition_model, settings.embedding_dim)
        self.passive = PassiveLivenessDetector(settings.liveness_model, settings.liveness_threshold)
        self.active = ActiveLivenessDetector()
        self.store = FaceVectorStore(settings.db_path, settings.faiss_index_path, settings.embedding_dim)
        self.decision = DecisionEngine(
            settings.verification_threshold,
            settings.liveness_threshold,
            settings.consensus_frames,
            settings.consensus_pass_ratio,
        )

    def register(self, frame_bgr: np.ndarray, user_id: str, name: str) -> dict:
        result = self._extract_primary_face(frame_bgr)
        aligned, face, detection = result
        quality, quality_reasons = assess_face_quality(face)
        live = self.passive.predict(face)
        if quality < 0.60 or not live.passed:
            return {"registered": False, "reasons": quality_reasons + live.reasons}
        embedding = self.embedder.embed(aligned)
        self.store.add_user(user_id, name, embedding)
        return {"registered": True, "user_id": user_id, "quality": quality, "liveness": live.score}

    def verify(self, frame_bgr: np.ndarray) -> dict:
        enhanced = enhance_low_light(frame_bgr)
        try:
            aligned, face, detection = self._extract_primary_face(enhanced)
        except ValueError as exc:
            return {"accepted": False, "reason": str(exc)}
        quality, quality_reasons = assess_face_quality(face)
        passive = self.passive.predict(face)
        active_passed, prompt, active_metrics = self.active.update(detection.landmarks)
        embedding = self.embedder.embed(aligned)
        matches = self.store.search(embedding, top_k=1)
        best = matches[0] if matches else {"user_id": None, "score": 0.0}
        frame = VerificationFrame(
            matched_user_id=best["user_id"],
            similarity=float(best["score"]),
            passive_liveness=passive.score,
            active_passed=active_passed,
            quality=quality,
            reasons=quality_reasons + passive.reasons,
        )
        decision = self.decision.update(frame)
        return {
            **asdict(decision),
            "challenge": prompt,
            "active_metrics": active_metrics,
            "bbox": detection.bbox,
            "similarity": frame.similarity,
            "passive_liveness": passive.score,
            "quality": quality,
        }

    def _extract_primary_face(self, frame_bgr: np.ndarray):
        detections = self.detector.detect(frame_bgr)
        if not detections:
            raise ValueError("no_face_detected")
        detection = max(detections, key=lambda d: (d.bbox[2] - d.bbox[0]) * (d.bbox[3] - d.bbox[1]))
        x1, y1, x2, y2 = detection.bbox
        h, w = frame_bgr.shape[:2]
        x1, y1, x2, y2 = max(x1, 0), max(y1, 0), min(x2, w), min(y2, h)
        face = frame_bgr[y1:y2, x1:x2]
        if face.size == 0:
            raise ValueError("invalid_face_crop")
        aligned = align_face(frame_bgr, detection.landmarks)
        return aligned, face, detection
