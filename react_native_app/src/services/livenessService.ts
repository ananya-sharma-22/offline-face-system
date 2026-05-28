import type { LivenessChallenge, LivenessState } from "../types/auth";

const CHALLENGES: LivenessChallenge[] = ["blink", "smile", "turn_left", "turn_right"];

export class LivenessService {
  private activeChallenge: LivenessChallenge = "blink";

  nextChallenge(): LivenessChallenge {
    this.activeChallenge = CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)] ?? "blink";
    return this.activeChallenge;
  }

  getChallengeLabel(challenge = this.activeChallenge): string {
    switch (challenge) {
      case "blink":
        return "Blink eyes";
      case "smile":
        return "Smile";
      case "turn_left":
        return "Turn head left";
      case "turn_right":
        return "Turn head right";
      default:
        return "Follow prompt";
    }
  }

  evaluate(metrics: Record<string, number>): LivenessState {
    const blink = metrics.eyeAspectDrop ?? 0;
    const smile = metrics.mouthAspectGain ?? 0;
    const yaw = metrics.yawDegrees ?? 0;
    const passive = metrics.passiveSpoofScore ?? 0.78;

    const activePassed =
      (this.activeChallenge === "blink" && blink > 0.18) ||
      (this.activeChallenge === "smile" && smile > 0.12) ||
      (this.activeChallenge === "turn_left" && yaw < -10) ||
      (this.activeChallenge === "turn_right" && yaw > 10);

    const score = Math.min(1, passive * 0.65 + (activePassed ? 0.35 : 0));
    return {
      challenge: this.activeChallenge,
      passed: activePassed && score >= 0.70,
      score,
      reason: activePassed ? "active_passive_liveness_passed" : `waiting_for_${this.activeChallenge}`,
    };
  }
}
