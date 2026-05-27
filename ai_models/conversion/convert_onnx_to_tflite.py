from __future__ import annotations

import argparse
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--onnx", required=True)
    parser.add_argument("--saved-model", required=True)
    parser.add_argument("--tflite", required=True)
    args = parser.parse_args()
    print("Use onnx-tf or ai-edge-torch to export SavedModel first:")
    print(f"onnx-tf convert -i {args.onnx} -o {args.saved_model}")
    print("Then run TensorFlow Lite conversion with int8 calibration.")
    Path(args.tflite).parent.mkdir(parents=True, exist_ok=True)


if __name__ == "__main__":
    main()
