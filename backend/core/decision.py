from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field


@dataclass
class VerificationFrame:
    matched_user_id: str | None
    similarity: float
    passive_liveness: float
    active_passed: bool
    quality: float
    reasons: list[str]


@dataclass
class Decision:
    accepted: bool
    user_id: str | None
    confidence: float
    reasons: list[str]


class DecisionEngine:
    def __init__(self, threshold: float, liveness_threshold: float, window: int = 7, pass_ratio: float = 0.65):
        self.threshold = threshold
        self.liveness_threshold = liveness_threshold
        self.window = deque(maxlen=window)
        self.pass_ratio = pass_ratio

    def update(self, frame: VerificationFrame) -> Decision:
        self.window.append(frame)
        passing = [
            f for f in self.window
            if f.matched_user_id and f.similarity >= self.threshold and f.passive_liveness >= self.liveness_threshold and f.active_passed and f.quality >= 0.60
        ]
        accepted = len(passing) / max(len(self.window), 1) >= self.pass_ratio and len(self.window) == self.window.maxlen
        user_id = max((f.matched_user_id for f in passing), key=[f.matched_user_id for f in passing].count) if passing else None
        confidence = sum(f.similarity * 0.45 + f.passive_liveness * 0.35 + f.quality * 0.20 for f in self.window) / max(len(self.window), 1)
        reasons = sorted({reason for f in self.window for reason in f.reasons})
        return Decision(accepted, user_id, float(confidence), reasons)
