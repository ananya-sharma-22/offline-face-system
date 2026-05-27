from __future__ import annotations

import cv2
import numpy as np


def align_face(frame_bgr: np.ndarray, landmarks: np.ndarray, output_size: int = 112) -> np.ndarray:
    left_eye, right_eye = landmarks[0], landmarks[1]
    eye_center = ((left_eye + right_eye) / 2.0).astype(np.float32)
    dy, dx = right_eye[1] - left_eye[1], right_eye[0] - left_eye[0]
    angle = np.degrees(np.arctan2(dy, dx))
    desired_dist = output_size * 0.38
    current_dist = max(np.linalg.norm(right_eye - left_eye), 1.0)
    scale = desired_dist / current_dist
    matrix = cv2.getRotationMatrix2D(tuple(eye_center), angle, scale)
    matrix[0, 2] += output_size * 0.5 - eye_center[0]
    matrix[1, 2] += output_size * 0.38 - eye_center[1]
    return cv2.warpAffine(frame_bgr, matrix, (output_size, output_size), flags=cv2.INTER_LINEAR)
