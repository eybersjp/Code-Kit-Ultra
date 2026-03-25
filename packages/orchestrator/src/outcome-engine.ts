import type { RunOutcome } from "../../shared/src/phase10-types";
import { learnFromOutcome } from "../../learning/src/learning-engine";

export interface RecordOutcomeInput {
  runId: string;
  success: boolean;
  retryCount: number;
  timeTakenMs: number;
  qualityScore: number;
  adaptersUsed: string[];
  dominantFailureType?: string;
  notes?: string;
  userRating?: number;
  userFeedback?: string;
}

export function recordRunOutcome(input: RecordOutcomeInput): RunOutcome {
  const outcome: RunOutcome = {
    runId: input.runId,
    status: input.success ? "success" : "failed",
    success: input.success,
    retryCount: input.retryCount,
    timeTakenMs: input.timeTakenMs,
    qualityScore: input.qualityScore,
    adaptersUsed: input.adaptersUsed,
    dominantFailureType: input.dominantFailureType,
    notes: input.notes,
    userRating: input.userRating,
    userFeedback: input.userFeedback,
    createdAt: new Date().toISOString(),
  };

  learnFromOutcome(outcome);
  return outcome;
}
