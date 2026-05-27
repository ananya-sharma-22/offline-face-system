# Datalake 3.0 Offline Face System

Fully offline, lightweight edge-AI facial authentication system for Datalake 3.0. It combines MediaPipe Face Detection + FaceMesh tracking, MobileFaceNet recognition, encrypted local embeddings, and hybrid liveness checks for zero-network authentication.

## Features

- Ultra-fast MediaPipe Face Detection + FaceMesh tracking with CPU-safe fallback.
- Eye-landmark face alignment for MobileFaceNet embeddings.
- MobileFaceNet/ArcFace ONNX embedding extraction.
- Passive MiniFASNet anti-spoof hooks for photo, screen replay, reflection, and texture attacks.
- Active liveness with blink, head-turn, smile, and randomized challenge-response.
- Encrypted embedding storage in SQLite with FAISS vector search.
- Multi-frame consensus decision engine.
- Face quality scoring, low-light enhancement, FPS, confidence, spoof alerts, and RAM tracking.
- Datalake 3.0 local API routes for integration without cloud dependency.
- PyTorch -> ONNX -> TFLite conversion scripts.
- Flutter Android camera UI scaffold.

## Quick Start

```bash
cd /Users/ananyasharma/Desktop/offlinefacesystem/offline-face-system
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m pytest
python -m backend.camera_demo
```

## Datalake 3.0 Edge Terminal UI

The security-terminal dashboard lives in `web_terminal/`.

```bash
cd /Users/ananyasharma/Desktop/offlinefacesystem/offline-face-system
python3 -m http.server 5055
```

Open `http://localhost:5055/web_terminal/`. It is a fully offline browser UI with dashboard, enrollment, face verification, liveness protocol, local database, logs, system status, and architecture pages.

### Run From VS Code

Open this folder in VS Code:

```bash
open -a "Visual Studio Code" /Users/ananyasharma/Desktop/offlinefacesystem/offline-face-system
```

Then use `Terminal -> Run Task -> Run Datalake 3.0 Edge Terminal UI`.

The browser URL is:

```text
http://localhost:5055/web_terminal/
```

For real local detection in the browser UI, run the full system:

```bash
./run_full_system.sh
```

This starts:

- UI server: `http://localhost:5055/web_terminal/`
- Local AI API: `http://localhost:8080`

If `mediapipe` is installed, the API uses MediaPipe Face Detection + FaceMesh. Without that wheel, the app uses an offline CPU fallback so the demo still works locally.

### Datalake 3.0 Local APIs

```text
GET  /health
POST /detect
POST /datalake/v3/enroll
POST /datalake/v3/authenticate
```

All APIs run on `localhost:8080` and accept base64 image frames. No cloud or internet is required.

## Model Files

Place optimized models in `ai_models/weights/`:

- MediaPipe task files or runtime wheel
- `mobilefacenet.onnx`
- `minifasnet.onnx`

The Python demo includes classical fallbacks so the pipeline can run without downloaded models. Production accuracy requires trained model weights.

## Android Build

```bash
cd mobile_app
flutter pub get
flutter build apk --release --split-per-abi
```

Copy INT8 TFLite models into `mobile_app/assets/models/` before release builds.

## Offline Deployment

- Do not add cloud APIs.
- Keep Android network permissions disabled.
- Store embeddings locally in encrypted SQLite for production.
- Ship model assets inside the APK or side-load through an approved offline MDM process.

## Benchmarks Targets

- Face tracking: <50 ms with MediaPipe on low-end Android.
- Full verification: <1 second with seven-frame consensus.
- APK model budget: <150 MB total.
- RAM target: <400 MB on 4 GB devices.

## Project Layout

```text
mobile_app/       Flutter Android application
backend/          Python pipeline and optional local API
ai_models/        Weights, conversion, quantization
liveness/         Passive and active liveness modules
recognition/      Detection, alignment, embedding
database/         SQLite and FAISS local vector store
utils/            Logging and performance metrics
datasets/         Offline calibration and demo samples
deployment/       Docker, Android, scripts
evaluation/       Benchmarking and FAR/FRR metrics
docs/             Architecture, security, presentation notes
tests/            Unit tests
```
