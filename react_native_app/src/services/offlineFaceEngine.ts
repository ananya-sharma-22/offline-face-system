import { MODEL_CONFIG } from "../config/modelConfig";
import { LivenessService } from "./livenessService";
import { LocalStore } from "./localStore";
import type { FaceEmbeddingRecord, OfflineAuthResult } from "../types/auth";

const cosineSimilarity = (a: number[], b: number[]): number => {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    const av = a[index] ?? 0;
    const bv = b[index] ?? 0;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
};

export class OfflineFaceEngine {
  private readonly liveness = new LivenessService();

  constructor(private readonly store = new LocalStore()) {}

  async load(): Promise<void> {
    // Production hook: load TFLite models with react-native-fast-tflite here.
    // The prototype keeps this method explicit so host apps can preload at splash.
  }

  getChallengeLabel(): string {
    return this.liveness.getChallengeLabel(this.liveness.nextChallenge());
  }

  async enroll(userId: string, name: string, frameBytes: Uint8Array): Promise<FaceEmbeddingRecord> {
    const embedding = this.extractEmbedding(frameBytes);
    const now = new Date().toISOString();
    const record: FaceEmbeddingRecord = {
      userId,
      name,
      embedding,
      quality: this.estimateQuality(frameBytes),
      createdAt: now,
      updatedAt: now,
      synced: false,
    };
    await this.store.upsertUser(record);
    return record;
  }

  async verify(frameBytes: Uint8Array, metrics: Record<string, number>): Promise<OfflineAuthResult> {
    const started = Date.now();
    const liveness = this.liveness.evaluate(metrics);
    if (!liveness.passed) {
      const rejected = this.result("rejected", 0, liveness.score, started, [liveness.reason]);
      await this.store.appendAudit(rejected);
      return rejected;
    }

    const probe = this.extractEmbedding(frameBytes);
    const users = await this.store.getUsers();
    const ranked = users
      .map((user) => ({ user, score: cosineSimilarity(probe, user.embedding) }))
      .sort((a, b) => b.score - a.score);
    const best = ranked[0];

    const accepted = Boolean(best && best.score >= MODEL_CONFIG.runtime.recognitionThreshold);
    const result = this.result(
      accepted ? "accepted" : "rejected",
      best?.score ?? 0,
      liveness.score,
      started,
      accepted ? ["match_above_threshold"] : ["no_match_above_threshold"],
      best?.user,
    );
    await this.store.appendAudit(result);
    return result;
  }

  private result(
    decision: "accepted" | "rejected",
    confidence: number,
    livenessScore: number,
    started: number,
    reasons: string[],
    user?: FaceEmbeddingRecord,
  ): OfflineAuthResult {
    return {
      decision,
      userId: user?.userId,
      name: user?.name,
      confidence,
      livenessScore,
      latencyMs: Date.now() - started,
      reasons,
    };
  }

  private extractEmbedding(frameBytes: Uint8Array): number[] {
    // Prototype deterministic embedding. Replace with MobileFaceNet INT8 output.
    const dim = MODEL_CONFIG.recognizer.embeddingDim;
    const embedding = Array.from({ length: dim }, (_, index) => {
      const sample = frameBytes[index % Math.max(frameBytes.length, 1)] ?? index;
      return ((sample % 127) - 63) / 64;
    });
    const norm = Math.sqrt(embedding.reduce((sum, value) => sum + value * value, 0)) || 1;
    return embedding.map((value) => value / norm);
  }

  private estimateQuality(frameBytes: Uint8Array): number {
    if (!frameBytes.length) return 0;
    const sample = frameBytes.slice(0, Math.min(frameBytes.length, 4096));
    const mean = sample.reduce((sum, value) => sum + value, 0) / sample.length;
    const exposureScore = 1 - Math.min(Math.abs(mean - 128) / 128, 1);
    return Math.max(MODEL_CONFIG.runtime.qualityThreshold, Number(exposureScore.toFixed(2)));
  }
}
