import type { RunOutcome } from "../../shared/src/phase10-types";
import { learnFromOutcome } from "../../learning-engine/src/index";

export interface OutcomeInput {
  runId: string;
  success: boolean;
  retryCount: number;
  timeTakenMs: number;
  qualityScore: number;
  adaptersUsed: string[];
  failureType?: string;
  notes?: string;
}

export class OutcomeCapturer {
  static normalize(input: OutcomeInput): RunOutcome {
    return {
      runId: input.runId,
      status: input.success ? "success" : "failed",
      success: input.success,
      retryCount: input.retryCount,
      timeTakenMs: input.timeTakenMs,
      qualityScore: input.qualityScore,
      adaptersUsed: input.adaptersUsed,
      dominantFailureType: input.failureType,
      notes: input.notes,
      createdAt: new Date().toISOString(),
    };
  }

  static async record(outcome: RunOutcome): Promise<void> {
    console.log(`[OutcomeCapturer] Recorded outcome for run ${outcome.runId}: ${outcome.status}`);
    await learnFromOutcome(outcome);
  }
}
