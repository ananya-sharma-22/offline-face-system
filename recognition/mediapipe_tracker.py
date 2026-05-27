from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np

from recognition.detection import FaceDetection, FaceDetector

try:
    import mediapipe as mp
except Exception:
    mp = None


@dataclass
class TrackingResult:
    detections: list[FaceDetection]
    mesh_landmarks: list[np.ndarray]
    backend: str


class MediaPipeFaceTracker:
    def __init__(self, fallback_model: Path | None = None, confidence: float = 0.65):
        self.fallback = FaceDetector(fallback_model, confidence)
        self.backend = "opencv_fallback"
        self.face_detection = None
        self.face_mesh = None
        if mp:
            self.face_detection = mp.solutions.face_detection.FaceDetection(
                model_selection=0,
                min_detection_confidence=confidence,
            )
            self.face_mesh = mp.solutions.face_mesh.FaceMesh(
                static_image_mode=False,
                max_num_faces=1,
                refine_landmarks=True,
                min_detection_confidence=confidence,
                min_tracking_confidence=0.5,
            )
            self.backend = "mediapipe_face_detection_facemesh"

    def track(self, frame_bgr: np.ndarray) -> TrackingResult:
        if not self.face_detection or not self.face_mesh:
            return TrackingResult(self.fallback.detect(frame_bgr), [], self.backend)
        rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        h, w = frame_bgr.shape[:2]
        detection_result = self.face_detection.process(rgb)
        detections: list[FaceDetection] = []
        if detection_result.detections:
            for detection in detection_result.detections:
                box = detection.location_data.relative_bounding_box
                x1 = int(max(0, box.xmin) * w)
                y1 = int(max(0, box.ymin) * h)
                x2 = int(min(1, box.xmin + box.width) * w)
                y2 = int(min(1, box.ymin + box.height) * h)
                score = float(detection.score[0])
                landmarks = self._five_point_landmarks(detection, w, h, (x1, y1, x2, y2))
                detections.append(FaceDetection((x1, y1, x2, y2), score, landmarks))
        mesh_result = self.face_mesh.process(rgb)
        meshes = []
        if mesh_result.multi_face_landmarks:
            for face in mesh_result.multi_face_landmarks:
                meshes.append(np.array([[lm.x * w, lm.y * h, lm.z] for lm in face.landmark], dtype=np.float32))
        return TrackingResult(detections, meshes, self.backend)

    @staticmethod
    def _five_point_landmarks(detection, width: int, height: int, bbox: tuple[int, int, int, int]) -> np.ndarray:
        relative = detection.location_data.relative_keypoints
        if len(relative) >= 6:
            left_eye = relative[0]
            right_eye = relative[1]
            nose = relative[2]
            mouth = relative[3]
            left = [left_eye.x * width, left_eye.y * height]
            right = [right_eye.x * width, right_eye.y * height]
            nose_pt = [nose.x * width, nose.y * height]
            mouth_left = [mouth.x * width - (bbox[2] - bbox[0]) * 0.10, mouth.y * height]
            mouth_right = [mouth.x * width + (bbox[2] - bbox[0]) * 0.10, mouth.y * height]
            return np.array([left, right, nose_pt, mouth_left, mouth_right], dtype=np.float32)
        x1, y1, x2, y2 = bbox
        bw, bh = x2 - x1, y2 - y1
        return np.array(
            [
                [x1 + 0.33 * bw, y1 + 0.38 * bh],
                [x1 + 0.67 * bw, y1 + 0.38 * bh],
                [x1 + 0.50 * bw, y1 + 0.55 * bh],
                [x1 + 0.38 * bw, y1 + 0.74 * bh],
                [x1 + 0.62 * bw, y1 + 0.74 * bh],
            ],
            dtype=np.float32,
        )
