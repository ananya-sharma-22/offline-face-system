import 'package:flutter/material.dart';
import '../services/offline_face_engine.dart';

class FaceOverlay extends StatelessWidget {
  final VerificationResult result;
  const FaceOverlay({super.key, required this.result});

  @override
  Widget build(BuildContext context) {
    return CustomPaint(painter: _FaceOverlayPainter(result));
  }
}

class _FaceOverlayPainter extends CustomPainter {
  final VerificationResult result;
  _FaceOverlayPainter(this.result);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3
      ..color = result.accepted ? const Color(0xFF24D17E) : const Color(0xFFFFC857);
    final box = result.box;
    if (box != null) {
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(box.left * size.width, box.top * size.height, box.width * size.width, box.height * size.height),
          const Radius.circular(8),
        ),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _FaceOverlayPainter oldDelegate) => oldDelegate.result != result;
}
