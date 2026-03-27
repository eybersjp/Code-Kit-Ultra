import type { ConstraintResult } from "./constraint-engine";
import type { IntentVerificationResult } from "./intent-engine";
import type { ValidationResult } from "./validation-engine";
import type { ConsensusResult } from "./consensus-engine";

export interface ConfidenceScore {
  overall: number;
  alignmentScore: number;
  validationScore: number;
  policyScore: number;
  consensusScore: number;
  summary: string;
}

export function scoreExecution(params: {
  intent: IntentVerificationResult;
  validation: ValidationResult;
  constraints: ConstraintResult;
  consensus: ConsensusResult;
}): ConfidenceScore {
  const alignmentScore = params.intent.confidence;
  const validationScore = params.validation.valid ? 1 : 0.4;
  const policyScore = params.constraints.valid ? 1 : 0.2;
  const consensusScore =
    params.consensus.finalDecision === "approve"
      ? params.consensus.agreementScore
      : params.consensus.finalDecision === "revise"
      ? params.consensus.agreementScore * 0.6
      : 0.1;

  const overall = Number(((alignmentScore * 0.35) + (validationScore * 0.2) + (policyScore * 0.25) + (consensusScore * 0.2)).toFixed(2));

  return {
    overall,
    alignmentScore,
    validationScore,
    policyScore,
    consensusScore,
    summary: `Overall governed execution confidence: ${overall}`,
  };
}
