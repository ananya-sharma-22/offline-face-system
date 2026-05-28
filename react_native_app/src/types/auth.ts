export type AuthMode = "enroll" | "verify";

export type LivenessChallenge = "blink" | "smile" | "turn_left" | "turn_right";

export type AuthDecision = "accepted" | "rejected" | "pending";

export interface FaceEmbeddingRecord {
  userId: string;
  name: string;
  embedding: number[];
  quality: number;
  createdAt: string;
  updatedAt: string;
  synced: boolean;
}

export interface LivenessState {
  challenge: LivenessChallenge;
  passed: boolean;
  score: number;
  reason: string;
}

export interface OfflineAuthResult {
  decision: AuthDecision;
  userId?: string;
  name?: string;
  confidence: number;
  livenessScore: number;
  latencyMs: number;
  reasons: string[];
}

export interface SyncEnvelope {
  terminalId: string;
  generatedAt: string;
  enrollments: FaceEmbeddingRecord[];
  auditLogs: OfflineAuthResult[];
}
