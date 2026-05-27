import 'dart:async';
import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import '../services/offline_face_engine.dart';
import '../widgets/face_overlay.dart';
import '../widgets/status_panel.dart';

class VerificationScreen extends StatefulWidget {
  final String mode;
  const VerificationScreen({super.key, required this.mode});

  @override
  State<VerificationScreen> createState() => _VerificationScreenState();
}

class _VerificationScreenState extends State<VerificationScreen> {
  CameraController? _controller;
  final _engine = OfflineFaceEngine();
  VerificationResult _result = VerificationResult.idle();
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    await _engine.load();
    final cameras = await availableCameras();
    _controller = CameraController(cameras.first, ResolutionPreset.medium, enableAudio: false);
    await _controller!.initialize();
    await _controller!.startImageStream(_onFrame);
    if (mounted) setState(() {});
  }

  Future<void> _onFrame(CameraImage image) async {
    if (_busy) return;
    _busy = true;
    final result = widget.mode == 'register'
        ? await _engine.registerFrame(image, userId: 'demo_user', name: 'Demo User')
        : await _engine.verifyFrame(image);
    if (mounted) setState(() => _result = result);
    _busy = false;
  }

  @override
  void dispose() {
    _controller?.dispose();
    _engine.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final controller = _controller;
    return Scaffold(
      appBar: AppBar(title: Text(widget.mode == 'register' ? 'Register User' : 'Verify Face')),
      body: controller == null || !controller.value.isInitialized
          ? const Center(child: CircularProgressIndicator())
          : Stack(
              fit: StackFit.expand,
              children: [
                CameraPreview(controller),
                FaceOverlay(result: _result),
                Align(
                  alignment: Alignment.bottomCenter,
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: StatusPanel(title: _result.title, message: _result.message),
                  ),
                ),
              ],
            ),
    );
  }
}
