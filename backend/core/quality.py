from __future__ import annotations

import cv2
import numpy as np


def assess_face_quality(face_bgr: np.ndarray) -> tuple[float, list[str]]:
    gray = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2GRAY)
    brightness = float(gray.mean())
    sharpness = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    score = 1.0
    reasons = []
    if brightness < 55:
        score -= 0.30
        reasons.append("low_light")
    if brightness > 220:
        score -= 0.25
        reasons.append("over_exposed")
    if sharpness < 45:
        score -= 0.35
        reasons.append("blurred_face")
    return max(score, 0.0), reasons or ["good_quality"]


def enhance_low_light(frame_bgr: np.ndarray) -> np.ndarray:
    lab = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = cv2.merge((clahe.apply(l), a, b))
    return cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)
