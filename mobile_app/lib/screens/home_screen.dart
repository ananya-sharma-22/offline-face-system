import 'package:flutter/material.dart';
import '../widgets/status_panel.dart';
import 'verification_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('NHAI Offline Face System')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const StatusPanel(
                title: 'Offline Ready',
                message: 'Face verification, liveness checks, and local vector matching run on device.',
              ),
              const SizedBox(height: 20),
              FilledButton.icon(
                icon: const Icon(Icons.verified_user),
                label: const Text('Start Verification'),
                onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const VerificationScreen(mode: 'verify'))),
              ),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                icon: const Icon(Icons.person_add),
                label: const Text('Register User'),
                onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const VerificationScreen(mode: 'register'))),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
