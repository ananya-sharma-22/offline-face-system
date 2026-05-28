# NHAI / Datalake Offline Face System

Fully offline, lightweight edge-AI facial authentication system for Datalake/NHAI. It combines BlazeFace-style detection, MobileFaceNet recognition, encrypted local embeddings, active/passive liveness, React Native mobile integration, and delayed sync/purge for zero-network zones.

## Features

- Ultra-fast BlazeFace/MediaPipe-compatible face tracking with CPU-safe fallback.
- Eye-landmark face alignment for MobileFaceNet embeddings.
- MobileFaceNet/ArcFace ONNX embedding extraction.
- Passive MiniFASNet anti-spoof hooks for photo, screen replay, reflection, and texture attacks.
- Active liveness with blink, head-turn, smile, and randomized challenge-response.
- Encrypted embedding storage in SQLite with FAISS vector search.
- Multi-frame consensus decision engine.
- Face quality scoring, low-light enhancement, FPS, confidence, spoof alerts, and RAM tracking.
- Datalake 3.0 local API routes for integration without cloud dependency.
- PyTorch -> ONNX -> TFLite conversion scripts.
- React Native Android + iOS prototype scaffold.
- Sync and purge mechanism for AWS upload after connectivity returns.

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

## Drop-In Integration

This project can also be embedded into an existing web app or Python backend.

Web:

```html
<script type="module" src="./sdk/web/nhai-offline-auth-widget.js"></script>
<nhai-offline-auth src="./web_terminal/" view="verify" height="820px"></nhai-offline-auth>
```

Python:

```python
from sdk.python.nhai_offline_auth import NHAIOfflineAuth

auth = NHAIOfflineAuth()
result = auth.authenticate("camera_frame.jpg")
```

Full integration details are in `docs/INTEGRATION_GUIDE.md`.

## React Native Prototype

The mandatory cross-platform mobile prototype lives in `react_native_app/`.

```bash
cd react_native_app
npm install
npm run android
npm run ios
```

It includes:

- Android 8.0+ / iOS 12+ target notes.
- `react-native-vision-camera` camera flow.
- TFLite inference integration hooks.
- Offline active liveness challenges: blink, smile, head turn.
- Local embedding/audit storage.
- AWS-compatible sync and purge service.
- Responsive phone/tablet layouts.

See `docs/REACT_NATIVE_DELIVERABLE.md`.

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

## Legacy Flutter Android Build

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
- Mobile model budget: target ~20 MB, current INT8 manifest target ~6.9 MB.
- RAM target: <400 MB on 4 GB devices.

## Project Layout

```text
react_native_app/ React Native Android/iOS prototype
mobile_app/       Legacy Flutter Android scaffold
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
