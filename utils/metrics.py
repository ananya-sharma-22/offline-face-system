from __future__ import annotations

import time
from collections import deque
from dataclasses import dataclass, field

import psutil


@dataclass
class FPSMeter:
    window: int = 30
    ticks: deque[float] = field(default_factory=lambda: deque(maxlen=30))

    def update(self) -> float:
        now = time.perf_counter()
        self.ticks.append(now)
        if len(self.ticks) < 2:
            return 0.0
        return (len(self.ticks) - 1) / max(self.ticks[-1] - self.ticks[0], 1e-6)


def ram_usage_mb() -> float:
    return psutil.Process().memory_info().rss / (1024 * 1024)


class Timer:
    def __enter__(self):
        self.start = time.perf_counter()
        return self

    def __exit__(self, *args):
        self.ms = (time.perf_counter() - self.start) * 1000
