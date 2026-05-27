import 'dart:math';
import 'package:camera/camera.dart';

class VerificationResult {
  final bool accepted;
  final String title;
  final String message;
  final double confidence;
  final RectBox? box;

  VerificationResult({required this.accepted, required this.title, required this.message, required this.confidence, this.box});
  factory VerificationResult.idle() => VerificationResult(accepted: false, title: 'Position Face', message: 'Keep your face inside the frame.', confidence: 0);
}

class RectBox {
  final double left;
  final double top;
  final double width;
  final double height;
  const RectBox(this.left, this.top, this.width, this.height);
}

class OfflineFaceEngine {
  Future<void> load() async {
    // Load blazeface.tflite, mobilefacenet_int8.tflite, and minifasnet_int8.tflite here.
    // The class is intentionally isolated so platform channels or tflite_flutter can replace this demo logic.
  }

  Future<VerificationResult> verifyFrame(CameraImage image) async {
    final confidence = 0.55 + Random().nextDouble() * 0.35;
    return VerificationResult(
      accepted: confidence > 0.78,
      title: confidence > 0.78 ? 'Verified Offline' : 'Checking Liveness',
      message: 'Confidence ${(confidence * 100).toStringAsFixed(0)}% · blink or turn when prompted',
      confidence: confidence,
      box: const RectBox(0.24, 0.18, 0.52, 0.42),
    );
  }

  Future<VerificationResult> registerFrame(CameraImage image, {required String userId, required String name}) async {
    return VerificationResult(
      accepted: true,
      title: 'Registration Ready',
      message: 'Local embedding captured for $name. Store in encrypted SQLite on device.',
      confidence: 0.91,
      box: const RectBox(0.24, 0.18, 0.52, 0.42),
    );
  }

  void close() {}
}
