from __future__ import annotations

import numpy as np


def far_frr(genuine_scores: list[float], impostor_scores: list[float], threshold: float) -> dict[str, float]:
    genuine = np.array(genuine_scores)
    impostor = np.array(impostor_scores)
    frr = float(np.mean(genuine < threshold)) if len(genuine) else 0.0
    far = float(np.mean(impostor >= threshold)) if len(impostor) else 0.0
    return {"FAR": far, "FRR": frr, "threshold": threshold}


def eer(genuine_scores: list[float], impostor_scores: list[float]) -> float:
    thresholds = np.linspace(-1, 1, 400)
    values = [far_frr(genuine_scores, impostor_scores, float(t)) for t in thresholds]
    return min(values, key=lambda x: abs(x["FAR"] - x["FRR"]))["threshold"]
