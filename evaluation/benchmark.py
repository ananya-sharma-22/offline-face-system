from __future__ import annotations

import argparse
import time
from pathlib import Path

import cv2
import numpy as np

from backend.core.pipeline import OfflineFacePipeline
from utils.metrics import ram_usage_mb


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--image-dir", default="datasets/sample_faces")
    args = parser.parse_args()
    pipeline = OfflineFacePipeline()
    latencies = []
    for image_path in Path(args.image_dir).glob("*.*"):
        image = cv2.imread(str(image_path))
        if image is None:
            continue
        start = time.perf_counter()
        result = pipeline.verify(image)
        latencies.append((time.perf_counter() - start) * 1000)
        print(image_path.name, result)
    if latencies:
        print({"avg_ms": float(np.mean(latencies)), "p95_ms": float(np.percentile(latencies, 95)), "ram_mb": ram_usage_mb()})


if __name__ == "__main__":
    main()
