import type { ConfidenceScore } from "./confidence-engine";
import type { ConstraintResult } from "./constraint-engine";
import type { ConsensusResult } from "./consensus-engine";

export interface KillSwitchResult {
  blocked: boolean;
  reason: string;
  code: string;
}

export function evaluateKillSwitch(params: {
  confidence: ConfidenceScore;
  constraints: ConstraintResult;
  consensus: ConsensusResult;
  threshold?: number;
}): KillSwitchResult {
  const threshold = params.threshold ?? 0.7;
  if (!params.constraints.valid) return { blocked: true, code: "CONSTRAINT_VIOLATION", reason: "Execution blocked due to constraint violations." };
  if (params.consensus.finalDecision === "reject") return { blocked: true, code: "CONSENSUS_REJECTED", reason: "Execution blocked because consensus rejected the batch." };
  if (params.confidence.overall < threshold) return { blocked: true, code: "LOW_CONFIDENCE", reason: `Execution blocked because confidence ${params.confidence.overall} is below threshold ${threshold}.` };
  return { blocked: false, code: "CLEAR", reason: "Execution cleared by governed autonomy layer." };
}
