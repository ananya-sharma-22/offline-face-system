export const MODEL_CONFIG = {
  targetTotalSizeMb: 20,
  detector: {
    name: "BlazeFace short-range INT8",
    asset: "blazeface_short_int8.tflite",
    expectedSizeMb: 0.8,
  },
  recognizer: {
    name: "MobileFaceNet ArcFace INT8",
    asset: "mobilefacenet_512_int8.tflite",
    expectedSizeMb: 4.2,
    embeddingDim: 512,
  },
  liveness: {
    name: "MiniFASNet INT8 + active challenge heuristics",
    asset: "minifasnet_int8.tflite",
    expectedSizeMb: 1.9,
  },
  runtime: {
    maxVerificationLatencyMs: 1000,
    minAndroidApi: 26,
    minIos: "12.0",
    minRamGb: 3,
    recognitionThreshold: 0.62,
    qualityThreshold: 0.72,
    livenessThreshold: 0.70,
  },
} as const;

export const INDIAN_FIELD_CONDITIONS = [
  "harsh_sunlight",
  "low_light",
  "shadowed_face",
  "helmet_or_cap_shadow",
  "regional_skin_tone_variation",
  "outdoor_toll_plaza_background",
] as const;
