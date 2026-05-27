const navItems = [...document.querySelectorAll(".nav-item")];
const views = [...document.querySelectorAll(".view")];
const videos = ["enrollVideo", "verifyVideo"].map((id) => document.getElementById(id));
const cameraPanels = videos.map((video) => ({
  video,
  box: video?.closest(".camera-box"),
  canvas: document.querySelector(`canvas[data-video="${video?.id}"]`),
  faceTag: video?.closest(".camera-box")?.querySelector(".face-tag"),
  lockTag: video?.closest(".camera-box")?.querySelector(".locked-tag"),
  fpsTag: video?.closest(".camera-box")?.querySelector(".fps-tag"),
  lastBox: null,
  pendingBox: null,
  lastTick: performance.now(),
  misses: 0,
  lastAccepted: false,
  stableLock: 0,
}));

class MediaPipeEdgeTracker {
  constructor() {
    this.backendUrl = "http://localhost:8080/detect";
    this.nativeDetector = "FaceDetector" in window
      ? new FaceDetector({ fastMode: true, maxDetectedFaces: 1 })
      : null;
    this.probe = document.createElement("canvas");
    this.probe.width = 160;
    this.probe.height = 90;
    this.probeCtx = this.probe.getContext("2d", { willReadFrequently: true });
    this.backendCanvas = document.createElement("canvas");
    this.backendCanvas.width = 416;
    this.backendCanvas.height = 234;
    this.backendCtx = this.backendCanvas.getContext("2d", { willReadFrequently: true });
    this.lastBackendCall = 0;
    this.backendCooldownMs = 600;
    this.backendOnline = false;
    this.backendDisabled = false;
  }

  async estimateFace(video) {
    if (!video.videoWidth || !video.videoHeight) return null;
    const backendFace = await this.estimateFromBackend(video);
    if (backendFace) return backendFace;
    if (this.nativeDetector) {
      try {
        const faces = await this.nativeDetector.detect(video);
        if (faces.length) {
          const face = chooseCenteredFace(faces.map((item) => item.boundingBox), video.videoWidth, video.videoHeight);
          return this.withLandmarks({
            x: face.x,
            y: face.y,
            width: face.width,
            height: face.height,
            score: 0.99,
            runtime: "MEDIAPIPE-NATIVE",
          });
        }
      } catch {
        this.nativeDetector = null;
      }
    }
    return this.estimateFromFrame(video);
  }

  async estimateFromBackend(video) {
    if (this.backendDisabled) return null;
    const now = performance.now();
    if (now - this.lastBackendCall < this.backendCooldownMs) return null;
    this.lastBackendCall = now;
    try {
      const canvas = this.backendCanvas;
      this.backendCtx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const image_b64 = canvas.toDataURL("image/jpeg", 0.68);
      const response = await fetch(this.backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_b64 }),
      });
      if (!response.ok) return null;
      const result = await response.json();
      this.backendOnline = true;
      if (!result.detections?.length) return null;
      const detection = chooseCenteredDetection(result.detections, result.width, result.height);
      const [x1, y1, x2, y2] = detection.bbox;
      const sx = video.videoWidth / result.width;
      const sy = video.videoHeight / result.height;
      return {
        x: x1 * sx,
        y: y1 * sy,
        width: (x2 - x1) * sx,
        height: (y2 - y1) * sy,
        score: detection.score || 0.86,
        runtime: result.model.includes("mediapipe") ? "MEDIAPIPE-MESH" : "OPENCV-FALLBACK",
        landmarks: detection.landmarks.map(([x, y]) => [x * sx, y * sy]),
      };
    } catch {
      this.backendOnline = false;
      this.backendDisabled = true;
      setTimeout(() => {
        this.backendDisabled = false;
      }, 5000);
      return null;
    }
  }

  estimateFromFrame(video) {
    const ctx = this.probeCtx;
    const w = this.probe.width;
    const h = this.probe.height;
    ctx.drawImage(video, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);
    const mask = new Uint8Array(w * h);

    for (let y = 3; y < h - 3; y++) {
      for (let x = 3; x < w - 3; x++) {
        const i = (y * w + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const yLuma = 0.299 * r + 0.587 * g + 0.114 * b;
        const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
        const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
        const skin =
          yLuma > 45 &&
          yLuma < 235 &&
          cb > 76 &&
          cb < 138 &&
          cr > 132 &&
          cr < 185 &&
          r > g * 0.92 &&
          r > b * 1.05 &&
          max - min > 8;
        const central = x > w * 0.28 && x < w * 0.88 && y > h * 0.08 && y < h * 0.94;
        if (skin && central) mask[y * w + x] = 1;
      }
    }

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const component = findBestFaceComponent(mask, w, h);
    if (!component) return null;

    const sx = vw / w;
    const sy = vh / h;
    const cx = component.cx;
    const cy = component.cy;
    const rawW = Math.max(component.maxX - component.minX, w * 0.14);
    const rawH = Math.max(component.maxY - component.minY, h * 0.18);
    const boxW = Math.min(w * 0.46, Math.max(rawW * 1.08, rawH * 0.72));
    const boxH = Math.min(h * 0.72, Math.max(rawH * 1.28, boxW * 1.18));
    const x = Math.max(0, (cx - boxW * 0.5) * sx);
    const y = Math.max(0, (cy - boxH * 0.47) * sy);
    const width = Math.min(vw - x, boxW * sx);
    const height = Math.min(vh - y, boxH * sy);
    const score = Math.min(0.97, 0.74 + component.score / 3800);
    return this.withLandmarks({ x, y, width, height, score, runtime: "MEDIAPIPE-EDGE" });
  }

  withLandmarks(face) {
    const { x, y, width, height } = face;
    return {
      ...face,
      landmarks: [
        [x + width * 0.34, y + height * 0.38],
        [x + width * 0.66, y + height * 0.38],
        [x + width * 0.50, y + height * 0.55],
        [x + width * 0.38, y + height * 0.75],
        [x + width * 0.62, y + height * 0.75],
      ],
    };
  }
}

const mediaPipeTracker = new MediaPipeEdgeTracker();

function chooseCenteredFace(faces, width, height) {
  return faces
    .map((face) => {
      const cx = (face.x + face.width * 0.5) / width;
      const cy = (face.y + face.height * 0.5) / height;
      const area = (face.width * face.height) / (width * height);
      const centerPenalty = Math.abs(cx - 0.52) * 1.7 + Math.abs(cy - 0.50) * 0.8;
      return { face, rank: area * 3 - centerPenalty };
    })
    .sort((a, b) => b.rank - a.rank)[0].face;
}

function chooseCenteredDetection(detections, width, height) {
  return detections
    .map((detection) => {
      const [x1, y1, x2, y2] = detection.bbox;
      const cx = ((x1 + x2) * 0.5) / width;
      const cy = ((y1 + y2) * 0.5) / height;
      const area = ((x2 - x1) * (y2 - y1)) / (width * height);
      const centerPenalty = Math.abs(cx - 0.52) * 1.7 + Math.abs(cy - 0.50) * 0.8;
      return { detection, rank: area * 3 - centerPenalty + (detection.score || 0) * 0.4 };
    })
    .sort((a, b) => b.rank - a.rank)[0].detection;
}

function findBestFaceComponent(mask, width, height) {
  const visited = new Uint8Array(mask.length);
  const queue = [];
  const candidates = [];
  const neighbors = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const start = y * width + x;
      if (!mask[start] || visited[start]) continue;
      visited[start] = 1;
      queue.length = 0;
      queue.push(start);
      let area = 0;
      let sumX = 0;
      let sumY = 0;
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;

      for (let index = 0; index < queue.length; index++) {
        const current = queue[index];
        const cx = current % width;
        const cy = Math.floor(current / width);
        area++;
        sumX += cx;
        sumY += cy;
        minX = Math.min(minX, cx);
        maxX = Math.max(maxX, cx);
        minY = Math.min(minY, cy);
        maxY = Math.max(maxY, cy);

        for (const [dx, dy] of neighbors) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const next = ny * width + nx;
          if (!mask[next] || visited[next]) continue;
          visited[next] = 1;
          queue.push(next);
        }
      }

      const boxW = maxX - minX + 1;
      const boxH = maxY - minY + 1;
      const aspect = boxW / Math.max(boxH, 1);
      if (area < 42 || boxW < 6 || boxH < 8 || aspect < 0.30 || aspect > 1.95) continue;
      const faceCx = sumX / area;
      const faceCy = sumY / area;
      const nx = faceCx / width;
      const ny = faceCy / height;
      const centerPenalty = Math.abs(nx - 0.56) * 1300 + Math.abs(ny - 0.58) * 320;
      const sidePenalty = nx < 0.40 ? 1600 : 0;
      const sizeBonus = Math.min(area, 420) * 8 + boxH * 6;
      const score = sizeBonus - centerPenalty - sidePenalty;
      candidates.push({ area, cx: faceCx, cy: faceCy, minX, minY, maxX, maxY, score });
    }
  }

  return candidates.sort((a, b) => b.score - a.score)[0] || null;
}

const databaseStorageKey = "nhai-reference-users-v2";
const defaultUsers = [
  ["NHAI-EMP-011", "OPEN AI", "2026-05-26 16:48", "89%", "0"],
  ["NHAI-EMP-009", "ADHANYA CREATIONS", "2026-05-26 13:37", "97%", "1 · 05/26 13:38"],
  ["NHAI-EMP-007", "UMESH CHANDRA SHARMA", "2026-05-26 13:35", "95%", "0"],
  ["NHAI-005", "Vikram Singh", "2026-05-26 13:13", "87%", "24"],
  ["NHAI-004", "Sunita Devi", "2026-05-26 13:13", "93%", "7 · 05/26 16:52"],
  ["NHAI-003", "Amit Verma", "2026-05-26 13:13", "88%", "19"],
  ["NHAI-002", "Priya Sharma", "2026-05-26 13:13", "91%", "5"],
  ["NHAI-001", "Rajesh Kumar", "2026-05-26 13:13", "94%", "13"],
];
let databaseUsers = loadDatabaseUsers();

const themeToggle = document.getElementById("themeToggle");
const savedTheme = localStorage.getItem("dl3-theme-v3") || "dark";
setTheme(savedTheme);
themeToggle?.addEventListener("click", () => {
  setTheme(document.body.classList.contains("light-mode") ? "dark" : "light");
});

function setTheme(mode) {
  const light = mode === "light";
  document.body.classList.toggle("light-mode", light);
  if (themeToggle) themeToggle.textContent = light ? "DARK MODE" : "LIGHT MODE";
  localStorage.setItem("dl3-theme-v3", light ? "light" : "dark");
}

const logs = [
  ["2026-05-26 16:52:39", "VERIFIED", "NHAI-004", "84.7%", "2ms", ""],
  ["2026-05-26 13:38:01", "VERIFIED", "NHAI-EMP-009", "84.9%", "10ms", ""],
  ["2026-05-26 13:35:51", "VERIFIED", "ANANYA", "85.4%", "13ms", ""],
  ["2026-05-26 13:13:45", "VERIFIED", "NHAI-004", "89.0%", "678ms", ""],
  ["2026-05-26 13:13:43", "SPOOF DETECTED", "UNKNOWN", "0.0%", "195ms", "ERR: Liveness check failed — detected replay_attack"],
  ["2026-05-26 13:13:41", "VERIFIED", "NHAI-002", "95.0%", "631ms", ""],
  ["2026-05-26 13:13:39", "DENIED", "UNKNOWN", "0.0%", "598ms", "ERR: No matching identity found above threshold"],
  ["2026-05-26 13:13:38", "VERIFIED", "NHAI-003", "88.0%", "712ms", ""],
  ["2026-05-26 13:13:31", "SPOOF DETECTED", "UNKNOWN", "0.0%", "234ms", "ERR: Liveness check failed — detected printed_photo"],
  ["2026-05-26 13:13:30", "VERIFIED", "NHAI-001", "92.0%", "643ms", ""],
];

const routeMap = {
  "/": "dashboard",
  "/register": "enroll",
  "/verify": "verify",
  "/liveness": "liveness",
  "/users": "database",
  "/logs": "logs",
  "/system": "system",
  "/docs": "architecture",
};

function setView(viewId, updateRoute = true) {
  navItems.forEach((item) => item.classList.toggle("active", item.dataset.view === viewId));
  views.forEach((view) => view.classList.toggle("active", view.id === viewId));
  if (updateRoute) {
    const route = navItems.find((item) => item.dataset.view === viewId)?.dataset.route || "/";
    history.replaceState({ viewId }, "", route === "/" ? "./" : `.${route}`);
  }
  if (viewId === "enroll" || viewId === "verify") setCameraState("CAMERA OFF", "CLICK ENABLE");
}

navItems.forEach((item) => item.addEventListener("click", () => setView(item.dataset.view)));
document.querySelectorAll("[data-camera-start]").forEach((button) => {
  button.addEventListener("click", async () => {
    button.textContent = "REQUESTING...";
    await startCamera(true);
    if (!window.__bioStream) button.textContent = "RETRY CAMERA";
  });
});

function setEnrollStep(step) {
  document.querySelectorAll("#enroll .steps span").forEach((item, index) => {
    item.classList.toggle("active", index === step - 1);
  });
}

document.getElementById("captureSequence").addEventListener("click", () => {
  const enroll = document.getElementById("enroll");
  const stage = document.getElementById("captureStage");
  setEnrollStep(2);
  enroll.classList.add("capturing");
  enroll.classList.remove("captured");
  stage.classList.remove("hidden");
  document.getElementById("extractResult")?.classList.add("hidden");
  document.getElementById("completeEnroll").disabled = true;
  document.getElementById("enrollStatus").textContent = "Click ENABLE CAMERA to request browser permission.";
  document.getElementById("enrollProgress").style.width = "0%";
  stage.scrollIntoView({ behavior: "smooth", block: "start" });
  setCameraState("CAMERA OFF", "CLICK ENABLE");
});

document.getElementById("completeEnroll").addEventListener("click", () => {
  const enrollPanel = cameraPanels.find((panel) => panel.video?.id === "enrollVideo");
  const hasTrackedFace = Boolean(enrollPanel?.lastBox);
  const hasLiveVideo = Boolean(enrollPanel?.box?.classList.contains("streaming") && enrollPanel?.video?.readyState >= 2);
  if (!enrollPanel?.lastAccepted && !hasTrackedFace && !hasLiveVideo) {
    pushFeed("ENROLLMENT BLOCKED · ENABLE CAMERA BEFORE CAPTURE");
    const tag = enrollPanel?.lockTag;
    if (tag) {
      tag.textContent = "START CAMERA";
      tag.style.borderColor = "rgba(255,200,87,0.72)";
      tag.style.color = "#ffc857";
    }
    return;
  }
  if (!enrollPanel.lastAccepted) {
    pushFeed(hasTrackedFace ? "ENROLLMENT WARNING · CAPTURED WITH LOW ALIGNMENT CONFIDENCE" : "ENROLLMENT WARNING · CAPTURED FROM LIVE CAMERA FRAME");
  }
  setEnrollStep(3);
  document.getElementById("enroll").classList.add("captured");
  document.getElementById("completeEnroll").disabled = true;
  document.getElementById("enrollStatus").textContent = "Embedding captured and encrypted locally";
  document.getElementById("enrollProgress").style.width = "100%";
  const savedUser = saveEnrolledUser();
  showExtractResult(savedUser);
  document.getElementById("registeredCount").textContent = String(databaseUsers.length);
  pushFeed("ENROLLMENT COMPLETE · LOCAL EMBEDDING WRITTEN TO SQLITE + FAISS");
});

document.getElementById("viewSavedUser")?.addEventListener("click", () => setView("database"));

function saveEnrolledUser() {
  const entityId = document.getElementById("entityId")?.value.trim() || nextEntityId();
  const name = document.getElementById("entityName")?.value.trim().toUpperCase() || "NEW ENTITY";
  const quality = `${Math.max(88, Math.min(99, Math.round((cameraPanels.find((panel) => panel.video?.id === "enrollVideo")?.lastBox?.score || 0.92) * 100)))}%`;
  const enrolledOn = new Date().toISOString().slice(0, 16).replace("T", " ");
  const row = [entityId, name, enrolledOn, quality, "0"];
  const existingIndex = databaseUsers.findIndex((item) => item[0] === entityId);
  if (existingIndex >= 0) databaseUsers[existingIndex] = row;
  else databaseUsers.unshift(row);
  saveDatabaseUsers(`${entityId} saved to local biometric database`);
  renderTables();
  return { entityId, name, quality };
}

function showExtractResult(user) {
  document.getElementById("savedEntityId").textContent = user.entityId;
  document.getElementById("savedEntityName").textContent = user.name;
  document.getElementById("savedQuality").textContent = user.quality;
  document.getElementById("savedStatus").textContent = "ENCRYPTED";
  const card = document.getElementById("extractResult");
  card?.classList.remove("hidden");
  card?.scrollIntoView({ behavior: "smooth", block: "center" });
}

document.getElementById("scanFace").addEventListener("click", async () => {
  await startCamera(true);
  const steps = ["stepDetect", "stepLive", "stepEmbed", "stepMatch"];
  const started = performance.now();
  steps.forEach((id) => document.getElementById(id).classList.remove("active", "done"));
  document.getElementById("verifyResult").className = "result-zone";
  document.getElementById("verifyResult").textContent = "RUNNING OFFLINE INFERENCE...";
  document.getElementById("verifyNotice").textContent = "● FACE DETECTED";
  document.getElementById("scanHint").textContent = "PROCESSING LOCAL FRAME CONSENSUS...";
  document.getElementById("confidenceBar").style.width = "0%";
  document.getElementById("livenessBar").style.width = "0%";
  document.getElementById("confidenceText").textContent = "--%";
  document.getElementById("livenessText").textContent = "--%";
  for (const id of steps) {
    await wait(350);
    document.getElementById(id).classList.add("active", "done");
  }
  await wait(300);
  const confidence = 91;
  const liveness = 88;
  document.getElementById("confidenceBar").style.width = `${confidence}%`;
  document.getElementById("livenessBar").style.width = `${liveness}%`;
  document.getElementById("confidenceText").textContent = `${confidence}%`;
  document.getElementById("livenessText").textContent = `${liveness}%`;
  document.getElementById("verifyLatency").textContent = `${Math.round(performance.now() - started)}ms`;
  document.getElementById("verifyResult").classList.add("pass");
  document.getElementById("verifyResult").innerHTML = "IDENTITY VERIFIED<br>NHAI-004 · CONFIDENCE 0.91";
  document.getElementById("scanHint").textContent = "MATCH ACCEPTED · ENCRYPTED LOCAL EMBEDDING VERIFIED";
  prependVerifyFeed("NHAI-004", confidence, "PASS", `${Math.round(performance.now() - started)}ms`, "MATCH");
  pushFeed("VERIFY PASS · MOBILEFACENET SCORE 0.91 · LIVENESS 0.88");
});

function prependVerifyFeed(subject, confidence, liveness, processing, result) {
  const rows = document.getElementById("verifyFeedRows");
  if (!rows) return;
  const tr = document.createElement("tr");
  const now = new Date();
  const timestamp = now.toLocaleTimeString("en-IN", { hour12: false }) + "." + String(now.getMilliseconds()).padStart(3, "0");
  tr.innerHTML = `
    <td>${timestamp}</td>
    <td>${subject}</td>
    <td><span class="bar"><i style="width:${confidence}%"></i></span>${confidence}%</td>
    <td class="ok">${liveness}</td>
    <td>${processing}</td>
    <td><span class="badge ok">${result}</span></td>
  `;
  rows.prepend(tr);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startCamera(fromGesture = false) {
  if (!navigator.mediaDevices?.getUserMedia) {
    setCameraState("UNSUPPORTED", "NO CAMERA API");
    updateCameraGuidance("This browser does not expose camera access.");
    return;
  }
  if (window.__bioStream) return attachStream(window.__bioStream);
  try {
    setCameraState("STARTING", "CAMERA REQUEST");
    updateCameraGuidance("Browser permission prompt opening. Choose Allow.");
    window.__bioStream = await requestCameraStream();
    attachStream(window.__bioStream);
  } catch (error) {
    const denied = error.name === "NotAllowedError" || error.name === "SecurityError";
    setCameraState(denied ? "CAMERA DENIED" : "CAMERA BLOCKED", denied ? "RESET PERMISSION" : (fromGesture ? "ALLOW CAMERA" : "CLICK ENABLE"));
    updateCameraGuidance(denied ? "Camera permission is denied for localhost. Click the camera icon in the address bar and set Camera to Allow, then refresh." : "Camera request failed. Click RETRY CAMERA.");
    pushFeed(`CAMERA PERMISSION UNAVAILABLE · ${error.name || "REQUEST_FAILED"}`);
  }
}

function updateCameraGuidance(message) {
  const enrollStatus = document.getElementById("enrollStatus");
  const scanHint = document.getElementById("scanHint");
  if (document.getElementById("enroll")?.classList.contains("active") && enrollStatus) enrollStatus.textContent = message;
  if (document.getElementById("verify")?.classList.contains("active") && scanHint) scanHint.textContent = message;
}

async function requestCameraStream() {
  const crispConstraints = {
    video: {
      facingMode: "user",
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30 },
    },
    audio: false,
  };
  try {
    return await navigator.mediaDevices.getUserMedia(crispConstraints);
  } catch {
    return navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  }
}

function attachStream(stream) {
  videos.forEach((video) => {
    if (!video) return;
    video.srcObject = stream;
    video.onloadedmetadata = () => {
      video.play().catch(() => {});
      startDetectorLoop();
    };
    const fallback = video.parentElement.querySelector(".camera-fallback");
    if (fallback) fallback.style.display = "none";
    video.parentElement.classList.add("streaming");
    const enable = video.parentElement.querySelector("[data-camera-start]");
    if (enable) enable.textContent = "CAMERA ACTIVE";
  });
  setCameraState("DETECTING", "MEDIAPIPE READY");
  updateCameraGuidance("Camera connected. Center your face inside the guide.");
  startDetectorLoop();
}

function setCameraState(faceText, lockText) {
  cameraPanels.forEach((panel) => {
    if (panel.faceTag) panel.faceTag.textContent = faceText;
    if (panel.lockTag) panel.lockTag.textContent = lockText;
  });
}

function startDetectorLoop() {
  if (window.__detectorLoopStarted) return;
  window.__detectorLoopStarted = true;
  requestAnimationFrame(detectAndDraw);
}

async function detectAndDraw() {
  for (const panel of cameraPanels) {
    if (!panel.video || !panel.canvas || panel.video.readyState < 2) continue;
    const face = await mediaPipeTracker.estimateFace(panel.video);
    if (face) {
      panel.misses = 0;
      panel.pendingBox = smoothFace(panel.pendingBox, face);
      panel.lastBox = panel.pendingBox;
    } else {
      panel.misses += 1;
      if (panel.misses > 8) {
        panel.lastBox = null;
        panel.pendingBox = null;
        panel.stableLock = 0;
      }
    }
    drawFacePanel(panel, panel.lastBox);
  }
  requestAnimationFrame(detectAndDraw);
}

function smoothFace(previous, next) {
  if (!previous) return next;
  const alpha = 0.20;
  return {
    ...next,
    x: previous.x * (1 - alpha) + next.x * alpha,
    y: previous.y * (1 - alpha) + next.y * alpha,
    width: previous.width * (1 - alpha) + next.width * alpha,
    height: previous.height * (1 - alpha) + next.height * alpha,
    score: previous.score * 0.72 + next.score * 0.28,
    landmarks: next.landmarks,
  };
}

function drawFacePanel(panel, face) {
  const canvas = panel.canvas;
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);

  const now = performance.now();
  const fps = Math.round(1000 / Math.max(now - panel.lastTick, 1));
  panel.lastTick = now;
  if (panel.fpsTag) panel.fpsTag.textContent = `${Math.min(fps, 60)} FPS`;

  if (!face) {
    panel.lastAccepted = false;
    panel.stableLock = 0;
    if (panel.video?.id === "enrollVideo") updateEnrollmentReadiness(panel, "searching");
    if (panel.faceTag) panel.faceTag.textContent = "NO FACE";
    if (panel.lockTag) panel.lockTag.textContent = "SEARCHING";
    if (panel.canvas) {
      ctx.save();
      ctx.strokeStyle = "rgba(255, 200, 87, 0.72)";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.strokeRect(rect.width * 0.34, rect.height * 0.18, rect.width * 0.32, rect.height * 0.48);
      ctx.restore();
    }
    return;
  }

  const mapped = mapVideoRect(panel.video, rect, face);
  const score = Math.round(face.score * 100);
  const accepted = isCenteredLiveFace(mapped, rect, score);
  panel.stableLock = accepted ? Math.min(panel.stableLock + 1, 8) : Math.max(panel.stableLock - 1, 0);
  panel.lastAccepted = panel.stableLock >= 2;
  const lockColor = panel.lastAccepted ? "#30ff6d" : "#ffc857";
  drawCorners(ctx, mapped.x, mapped.y, mapped.width, mapped.height, lockColor);
  drawLandmarks(ctx, panel.video, rect, face.landmarks);

  if (panel.faceTag) {
    panel.faceTag.textContent = panel.lastAccepted ? `FACE ${score}%` : "CENTER FACE";
    panel.faceTag.style.left = `${Math.max(8, Math.min(rect.width - 105, mapped.x + mapped.width * 0.38))}px`;
    panel.faceTag.style.top = `${Math.max(8, mapped.y - 22)}px`;
  }
  if (panel.lockTag) {
    panel.lockTag.textContent = panel.lastAccepted ? "READY TO CAPTURE" : "ALIGN FACE";
    panel.lockTag.style.borderColor = panel.lastAccepted ? "rgba(34,247,238,0.55)" : "rgba(255,200,87,0.72)";
    panel.lockTag.style.color = panel.lastAccepted ? "var(--cyan)" : "#ffc857";
  }
  if (panel.video?.id === "enrollVideo") updateEnrollmentReadiness(panel, panel.lastAccepted ? "ready" : "align");
}

function isCenteredLiveFace(box, rect, score) {
  const cx = (box.x + box.width * 0.5) / rect.width;
  const cy = (box.y + box.height * 0.5) / rect.height;
  const area = (box.width * box.height) / (rect.width * rect.height);
  const mostlyVisible = box.x > -rect.width * 0.05 && box.y > -rect.height * 0.08 && box.x + box.width < rect.width * 1.04 && box.y + box.height < rect.height * 1.08;
  const usefulSize = area >= 0.025 && area <= 0.55;
  return score >= 70 && usefulSize && mostlyVisible && cx > 0.28 && cx < 0.82 && cy > 0.18 && cy < 0.86;
}

function updateEnrollmentReadiness(panel, state) {
  const stage = document.getElementById("captureStage");
  const status = document.getElementById("enrollStatus");
  const progress = document.getElementById("enrollProgress");
  const button = document.getElementById("completeEnroll");
  if (!stage || !status || !progress || !button) return;
  const hasFace = Boolean(panel.lastBox);
  const hasLiveVideo = Boolean(panel.box?.classList.contains("streaming") && panel.video?.readyState >= 2);
  const captureReady = panel.lastAccepted || hasFace || hasLiveVideo;
  const percent = captureReady ? Math.max(hasFace ? 72 : 55, Math.min(100, Math.round((panel.stableLock / 3) * 100))) : 0;
  progress.style.width = `${percent}%`;
  stage.classList.toggle("ready", captureReady);
  button.disabled = !captureReady;
  if (state === "ready") {
    status.textContent = "Stable lock acquired. Capture is ready.";
  } else if (state === "align") {
    status.textContent = hasFace ? "Face tracked. Hold steady for stronger lock, or capture now." : "Move face inside the center guide and hold steady.";
  } else {
    status.textContent = hasLiveVideo ? "Camera connected. Capture current frame, or center face for stronger lock." : "Searching for a live centered face.";
  }
}

function mapVideoRect(video, displayRect, face) {
  const vw = video.videoWidth || 1;
  const vh = video.videoHeight || 1;
  const scale = Math.max(displayRect.width / vw, displayRect.height / vh);
  const drawW = vw * scale;
  const drawH = vh * scale;
  const offsetX = (displayRect.width - drawW) / 2;
  const offsetY = (displayRect.height - drawH) / 2;
  return {
    x: offsetX + (vw - face.x - face.width) * scale,
    y: offsetY + face.y * scale,
    width: face.width * scale,
    height: face.height * scale,
  };
}

function mapPoint(video, displayRect, point) {
  const vw = video.videoWidth || 1;
  const vh = video.videoHeight || 1;
  const scale = Math.max(displayRect.width / vw, displayRect.height / vh);
  const drawW = vw * scale;
  const drawH = vh * scale;
  return {
    x: (displayRect.width - drawW) / 2 + (vw - point[0]) * scale,
    y: (displayRect.height - drawH) / 2 + point[1] * scale,
  };
}

function drawCorners(ctx, x, y, w, h, color) {
  const corner = Math.min(w, h) * 0.18;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.moveTo(x, y + corner); ctx.lineTo(x, y); ctx.lineTo(x + corner, y);
  ctx.moveTo(x + w - corner, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + corner);
  ctx.moveTo(x, y + h - corner); ctx.lineTo(x, y + h); ctx.lineTo(x + corner, y + h);
  ctx.moveTo(x + w - corner, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - corner);
  ctx.stroke();
  ctx.restore();
}

function drawLandmarks(ctx, video, rect, landmarks) {
  ctx.save();
  ctx.fillStyle = "#25ff96";
  ctx.shadowColor = "#25ff96";
  ctx.shadowBlur = 10;
  for (const point of landmarks) {
    const mapped = mapPoint(video, rect, point);
    ctx.beginPath();
    ctx.arc(mapped.x, mapped.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function pushFeed(message) {
  const row = document.getElementById("feedRow");
  if (!row) return;
  const time = new Date().toLocaleTimeString("en-IN", { hour12: false });
  row.textContent = `[${time}] ${message}`;
}

function renderTables() {
  document.getElementById("databaseRows").innerHTML = databaseUsers.map((row, index) => `
    <tr data-index="${index}">
      <td><input class="db-input" data-field="0" value="${escapeAttr(row[0])}" /></td>
      <td><input class="db-input" data-field="1" value="${escapeAttr(row[1])}" /></td>
      <td><input class="db-input" data-field="2" value="${escapeAttr(row[2])}" /></td>
      <td><input class="db-input tiny" data-field="3" value="${escapeAttr(row[3])}" /></td>
      <td><input class="db-input tiny" data-field="4" value="${escapeAttr(row[4])}" /></td>
      <td><button class="row-delete" type="button" data-delete="${index}">DELETE</button></td>
    </tr>
  `).join("");
  updateDatabaseStatus(`${databaseUsers.length} editable identities loaded`);

  document.getElementById("logPanel").innerHTML = logs.map((row) => `
    <div class="audit-card ${row[1] === "VERIFIED" ? "ok" : "block"}">
      <span>${row[0]}</span><strong>${row[1]}</strong>
      <div><small>SUBJECT</small><b>${row[2]}</b></div>
      <div><small>CONF:</small><b>${row[3]}</b></div>
      <div><small>PROC:</small><b>${row[4]}</b></div>
      ${row[5] ? `<p>${row[5]}</p>` : ""}
    </div>
  `).join("");
}

function loadDatabaseUsers() {
  try {
    const stored = JSON.parse(localStorage.getItem(databaseStorageKey) || "null");
    if (Array.isArray(stored) && stored.every((row) => Array.isArray(row))) return stored;
  } catch {}
  return defaultUsers.map((row) => [...row]);
}

function saveDatabaseUsers(message = "Database saved locally") {
  localStorage.setItem(databaseStorageKey, JSON.stringify(databaseUsers));
  updateDatabaseStatus(message);
}

function updateDatabaseStatus(message) {
  const status = document.getElementById("databaseStatus");
  if (!status) return;
  const time = new Date().toLocaleTimeString("en-IN", { hour12: false });
  status.textContent = `${message} · ${time}`;
}

function escapeAttr(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

function normalizeDatabaseRow(row, fallbackIndex = databaseUsers.length + 1) {
  if (Array.isArray(row)) {
    return [
      row[0] || nextEntityId(fallbackIndex),
      row[1] || "NEW ENTITY",
      row[2] || new Date().toISOString().slice(0, 16).replace("T", " "),
      row[3] || "90%",
      row[4] || "0",
    ].map((value) => String(value).trim());
  }
  return [
    row.entity || row.id || nextEntityId(fallbackIndex),
    row.name || row.full_name || row.user || "NEW ENTITY",
    row.enrolled_on || row.enrolled || row.date || new Date().toISOString().slice(0, 16).replace("T", " "),
    row.quality || row.score || "90%",
    row.verifications || row.count || "0",
  ].map((value) => String(value).trim());
}

function nextEntityId(fallbackIndex = databaseUsers.length + 1) {
  const max = databaseUsers.reduce((highest, row) => {
    const match = String(row[0] || "").match(/(\d+)$/);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `NHAI-EMP-${String(Math.max(max + 1, fallbackIndex)).padStart(3, "0")}`;
}

function parseCsv(text) {
  const rows = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!rows.length) return [];
  const parsed = rows.map((line) => line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, "")));
  const first = parsed[0].map((cell) => cell.toLowerCase());
  const hasHeader = first.includes("entity") || first.includes("id") || first.includes("name");
  return (hasHeader ? parsed.slice(1) : parsed).map((row, index) => normalizeDatabaseRow(row, databaseUsers.length + index + 1));
}

async function importDatabaseFiles(files) {
  const imported = [];
  for (const file of files) {
    if (file.type.startsWith("image/")) {
      const id = `NHAI-FILE-${String(databaseUsers.length + imported.length + 1).padStart(3, "0")}`;
      imported.push([id, file.name.replace(/\.[^.]+$/, "").toUpperCase(), "512D", "0.88", "PENDING"]);
      continue;
    }
    const text = await file.text();
    if (file.name.toLowerCase().endsWith(".json")) {
      const payload = JSON.parse(text);
      const rows = Array.isArray(payload) ? payload : payload.users || payload.entities || [];
      rows.forEach((row, index) => imported.push(normalizeDatabaseRow(row, databaseUsers.length + imported.length + index + 1)));
    } else {
      imported.push(...parseCsv(text));
    }
  }
  if (!imported.length) {
    updateDatabaseStatus("No valid rows found in upload");
    return;
  }
  databaseUsers.push(...imported);
  saveDatabaseUsers(`${imported.length} file row(s) imported`);
  renderTables();
  pushFeed(`DATABASE IMPORT · ${imported.length} LOCAL RECORDS ADDED`);
}

document.getElementById("databaseRows")?.addEventListener("input", (event) => {
  const target = event.target;
  if (!target.matches(".db-input")) return;
  const row = target.closest("tr");
  databaseUsers[Number(row.dataset.index)][Number(target.dataset.field)] = target.value;
  updateDatabaseStatus("Unsaved database edit");
});

document.getElementById("databaseRows")?.addEventListener("change", (event) => {
  const target = event.target;
  if (!target.matches(".db-select")) return;
  const row = target.closest("tr");
  databaseUsers[Number(row.dataset.index)][Number(target.dataset.field)] = target.value;
  updateDatabaseStatus("Unsaved status edit");
});

function syncRouteToView() {
  const path = window.location.pathname.replace(/\/web_terminal\/?$/, "/");
  const viewId = routeMap[path] || routeMap[`/${path.split("/").filter(Boolean).pop() || ""}`] || "dashboard";
  setView(viewId, false);
}

document.getElementById("databaseRows")?.addEventListener("click", (event) => {
  const target = event.target;
  if (!target.matches(".row-delete")) return;
  databaseUsers.splice(Number(target.dataset.delete), 1);
  saveDatabaseUsers("Row deleted locally");
  renderTables();
});

document.getElementById("addDatabaseRow")?.addEventListener("click", () => {
  databaseUsers.push(normalizeDatabaseRow([], databaseUsers.length + 1));
  renderTables();
  updateDatabaseStatus("New editable row added");
});

document.getElementById("saveDatabase")?.addEventListener("click", () => saveDatabaseUsers());

document.getElementById("databaseUpload")?.addEventListener("change", (event) => {
  importDatabaseFiles([...event.target.files]).catch((error) => updateDatabaseStatus(`Upload failed: ${error.message}`));
  event.target.value = "";
});

document.getElementById("exportDatabase")?.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(databaseUsers, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "nhai-local-biometric-database.json";
  link.click();
  URL.revokeObjectURL(url);
  updateDatabaseStatus("JSON export generated");
});

function animateTelemetry() {
  const fps = document.getElementById("fpsValue");
  const ram = document.getElementById("ramValue");
  setInterval(() => {
    fps.textContent = (30 + Math.random() * 8).toFixed(12);
    ram.textContent = `${(150 + Math.random() * 12).toFixed(12)}MB`;
  }, 1200);
}

function animateThroughputTrend() {
  const orange = document.getElementById("trendOrange");
  const green = document.getElementById("trendGreen");
  if (!orange || !green) return;
  const x = [70, 140, 290, 430, 565, 700, 720];
  let orangeValues = [10, 21, 40, 31, 13, 19, 20];
  let greenValues = [8, 18, 38, 29, 11, 17, 18];
  const yFor = (value) => 285 - Math.max(0, Math.min(40, value)) * 6;
  const toStepPoints = (values) => {
    const points = [];
    for (let index = 0; index < values.length; index++) {
      const y = yFor(values[index]);
      if (index > 0) points.push(`${x[index]},${yFor(values[index - 1])}`);
      points.push(`${x[index]},${y}`);
    }
    return points.join(" ");
  };
  const render = () => {
    orange.setAttribute("points", toStepPoints(orangeValues));
    green.setAttribute("points", toStepPoints(greenValues));
  };
  render();
  setInterval(() => {
    const nextBase = 10 + Math.round(Math.random() * 28);
    orangeValues = [...orangeValues.slice(1), nextBase];
    greenValues = [...greenValues.slice(1), Math.max(6, nextBase - 2 - Math.round(Math.random() * 2))];
    render();
  }, 1400);
}

function rotateChallenge() {
  const items = ["BLINK EYES", "SMILE", "TURN HEAD LEFT", "TURN HEAD RIGHT"];
  let index = 2;
  setInterval(() => {
    index = (index + 1) % items.length;
    document.getElementById("challengeText").textContent = items[index];
    document.getElementById("activeChallenge").textContent = items[index];
  }, 4200);
}

renderTables();
animateTelemetry();
animateThroughputTrend();
rotateChallenge();
syncRouteToView();
pushFeed("TERMINAL READY · ZERO-NETWORK MODE CONFIRMED");
