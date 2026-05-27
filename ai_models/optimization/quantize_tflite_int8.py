from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import tensorflow as tf


def representative_dataset():
    for _ in range(100):
        yield [np.random.uniform(-1, 1, (1, 112, 112, 3)).astype(np.float32)]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--saved-model", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    converter = tf.lite.TFLiteConverter.from_saved_model(args.saved_model)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    converter.representative_dataset = representative_dataset
    converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS_INT8]
    converter.inference_input_type = tf.int8
    converter.inference_output_type = tf.int8
    Path(args.output).write_bytes(converter.convert())


if __name__ == "__main__":
    main()
