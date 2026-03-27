import type {
  ConfidenceComponent,
  ConfidenceTrace,
  ConsensusTrace,
  ConstraintTrace,
  GovernanceDecision,
  GovernanceTrace,
  IntentTrace,
  ValidationTrace,
} from "./types";
import { clamp01, isoNow, round } from "./utils";

export interface TraceEngineInput {
  runId: string;
  summary: string;
  mode?: string;
  intent: IntentTrace;
  constraints: ConstraintTrace;
  validation: ValidationTrace;
  consensus: ConsensusTrace;
  confidenceComponents?: ConfidenceComponent[];
  confidenceThreshold?: number;
}

export function deriveConfidenceTrace(
  components: ConfidenceComponent[],
  threshold = 0.7,
): ConfidenceTrace {
  const totalWeight = components.reduce((sum, c) => sum + c.weight, 0) || 1;
  const rawScore = components.reduce((sum, c) => sum + c.score * c.weight, 0) / totalWeight;
  const score = round(clamp01(rawScore), 3);

  return {
    score,
    threshold,
    components,
    reason:
      score >= threshold
        ? `Confidence ${score} meets threshold ${threshold}.`
        : `Confidence ${score} is below threshold ${threshold}.`,
  };
}

export function deriveDefaultConfidenceComponents(input: {
  intent: IntentTrace;
  constraints: ConstraintTrace;
  validation: ValidationTrace;
  consensus: ConsensusTrace;
}): ConfidenceComponent[] {
  return [
    {
      key: "intent_alignment",
      label: "Intent Alignment",
      score: input.intent.passed ? input.intent.score ?? 0.9 : 0.2,
      weight: 0.25,
      note: input.intent.reason,
    },
    {
      key: "constraint_compliance",
      label: "Constraint Compliance",
      score: input.constraints.passed ? 1 : 0,
      weight: 0.3,
      note: input.constraints.passed
        ? "No blocking constraint violations found."
        : `${input.constraints.violations.length} violation(s) found.`,
    },
    {
      key: "validation_integrity",
      label: "Validation Integrity",
      score: input.validation.passed ? 0.95 : 0.15,
      weight: 0.2,
      note: input.validation.passed
        ? "Batch structure validated successfully."
        : input.validation.errors.join("; "),
    },
    {
      key: "consensus_strength",
      label: "Consensus Strength",
      score: clamp01(input.consensus.approvalWeight - input.consensus.rejectionWeight + 0.5),
      weight: 0.25,
      note: input.consensus.reason,
    },
  ];
}

export function buildGovernanceTrace(input: TraceEngineInput): GovernanceTrace {
  const components =
    input.confidenceComponents ??
    deriveDefaultConfidenceComponents({
      intent: input.intent,
      constraints: input.constraints,
      validation: input.validation,
      consensus: input.consensus,
    });

  const confidence = deriveConfidenceTrace(components, input.confidenceThreshold ?? 0.7);

  const finalDecision: GovernanceDecision =
    !input.constraints.passed || !input.validation.passed || confidence.score < confidence.threshold
      ? "blocked"
      : input.consensus.passed
        ? "execute"
        : "paused";

  const finalReason =
    finalDecision === "execute"
      ? "All required governance checks are satisfied."
      : finalDecision === "paused"
        ? "Consensus did not fully pass, but hard safety checks did; manual review recommended."
        : "One or more hard governance conditions failed.";

  return {
    runId: input.runId,
    summary: input.summary,
    mode: input.mode,
    createdAt: isoNow(),
    intent: input.intent,
    constraints: input.constraints,
    validation: input.validation,
    consensus: input.consensus,
    confidence,
    finalDecision,
    finalReason,
    suggestedAction:
      finalDecision === "execute"
        ? "Proceed with execution."
        : finalDecision === "paused"
          ? "Open review gate and inspect votes."
          : "Stop execution and resolve blocking issues.",
  };
}
