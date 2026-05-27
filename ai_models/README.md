# Model Assets

This folder is intentionally model-weight agnostic so the project remains offline and license-safe.

Expected production files:

- `weights/blazeface.onnx` or `weights/retinaface_mobilenet.onnx`
- `weights/mobilefacenet.onnx`
- `weights/minifasnet.onnx`
- Android copies in `mobile_app/assets/models/*.tflite`

Recommended optimization sequence:

1. Train or obtain license-compatible PyTorch checkpoints.
2. Export to ONNX with fixed mobile input sizes.
3. Validate ONNX Runtime output parity.
4. Convert to TensorFlow Lite.
5. Quantize to INT8 using representative highway/field images.
6. Benchmark on the lowest target Android device.
