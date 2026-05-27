from __future__ import annotations

import argparse

import cv2

from backend.config.settings import settings
from backend.core.pipeline import OfflineFacePipeline
from utils.metrics import FPSMeter, ram_usage_mb


def main() -> None:
    parser = argparse.ArgumentParser(description="Offline face verification camera demo")
    parser.add_argument("--register", action="store_true")
    parser.add_argument("--user-id", default="demo_user")
    parser.add_argument("--name", default="Demo User")
    args = parser.parse_args()

    pipeline = OfflineFacePipeline()
    cap = cv2.VideoCapture(settings.camera_index)
    fps = FPSMeter()
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if args.register:
            result = pipeline.register(frame, args.user_id, args.name)
            text = f"REGISTER: {result}"
        else:
            result = pipeline.verify(frame)
            text = f"VERIFY: {result.get('accepted')} {result.get('confidence', 0):.2f}"
            if "bbox" in result:
                x1, y1, x2, y2 = result["bbox"]
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 220, 0), 2)
        cv2.putText(frame, text[:90], (15, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 255), 2)
        cv2.putText(frame, f"FPS {fps.update():.1f} RAM {ram_usage_mb():.0f}MB", (15, 58), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 0), 2)
        cv2.imshow("NHAI Offline Face System", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break
    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
