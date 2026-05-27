from __future__ import annotations

import random
from collections import deque
from dataclasses import dataclass, field

import numpy as np


CHALLENGES = ("blink", "turn_left", "turn_right", "smile")


@dataclass
class ActiveChallenge:
    name: str
    prompt: str


@dataclass
class ActiveLivenessState:
    challenge: ActiveChallenge = field(default_factory=lambda: new_challenge())
    blink_history: deque[float] = field(default_factory=lambda: deque(maxlen=12))
    yaw_history: deque[float] = field(default_factory=lambda: deque(maxlen=12))
    smile_history: deque[float] = field(default_factory=lambda: deque(maxlen=12))


def new_challenge() -> ActiveChallenge:
    name = random.choice(CHALLENGES)
    prompts = {
        "blink": "Blink once",
        "turn_left": "Turn head left",
        "turn_right": "Turn head right",
        "smile": "Smile",
    }
    return ActiveChallenge(name, prompts[name])


class ActiveLivenessDetector:
    def __init__(self):
        self.state = ActiveLivenessState()

    def reset(self) -> ActiveChallenge:
        self.state = ActiveLivenessState()
        return self.state.challenge

    def update(self, landmarks: np.ndarray) -> tuple[bool, str, dict[str, float]]:
        metrics = self._estimate_metrics(landmarks)
        self.state.blink_history.append(metrics["eye_openness"])
        self.state.yaw_history.append(metrics["yaw"])
        self.state.smile_history.append(metrics["smile"])
        passed = self._is_passed()
        return passed, self.state.challenge.prompt, metrics

    def _is_passed(self) -> bool:
        name = self.state.challenge.name
        if name == "blink" and len(self.state.blink_history) >= 6:
            return min(self.state.blink_history) < 0.18 and max(self.state.blink_history) > 0.28
        if name == "turn_left":
            return min(self.state.yaw_history or [0]) < -0.16
        if name == "turn_right":
            return max(self.state.yaw_history or [0]) > 0.16
        if name == "smile":
            return max(self.state.smile_history or [0]) > 0.36
        return False

    @staticmethod
    def _estimate_metrics(landmarks: np.ndarray) -> dict[str, float]:
        left_eye, right_eye, nose, mouth_l, mouth_r = landmarks[:5]
        eye_distance = max(np.linalg.norm(right_eye - left_eye), 1e-6)
        yaw = float((nose[0] - (left_eye[0] + right_eye[0]) / 2.0) / eye_distance)
        mouth_width = np.linalg.norm(mouth_r - mouth_l)
        smile = float(mouth_width / max(eye_distance, 1e-6) - 0.65)
        # Five-point landmarks do not include eyelids; this keeps the interface ready for MediaPipe/RetinaFace landmarks.
        eye_openness = 0.32
        return {"yaw": yaw, "smile": smile, "eye_openness": eye_openness}
