export type GovernanceDecision = "execute" | "blocked" | "paused";
export type VoteDecision = "approve" | "reject" | "abstain";
export type CheckStatus = "pass" | "fail" | "warn" | "skipped";

export interface GovernanceVote {
  agent: string;
  decision: VoteDecision;
  weight: number;
  reason: string;
}

export interface IntentTrace {
  passed: boolean;
  score?: number;
  reason: string;
  matchedSignals?: string[];
  missingSignals?: string[];
}

export interface ConstraintTrace {
  passed: boolean;
  violations: string[];
  warnings?: string[];
  appliedPolicies?: string[];
}

export interface ValidationTrace {
  passed: boolean;
  errors: string[];
  warnings?: string[];
}

export interface ConsensusTrace {
  passed: boolean;
  votes: GovernanceVote[];
  approvalWeight: number;
  rejectionWeight: number;
  threshold: number;
  reason: string;
}

export interface ConfidenceComponent {
  key: string;
  label: string;
  score: number;
  weight: number;
  note?: string;
}

export interface ConfidenceTrace {
  score: number;
  threshold: number;
  components: ConfidenceComponent[];
  reason: string;
}

export interface TimelineEvent {
  id: string;
  runId: string;
  at: string;
  phase: string;
  event: string;
  detail: string;
  level: "info" | "warn" | "error";
  metadata?: Record<string, unknown>;
}

export interface GovernanceTrace {
  runId: string;
  summary: string;
  mode?: string;
  createdAt: string;
  intent: IntentTrace;
  constraints: ConstraintTrace;
  validation: ValidationTrace;
  consensus: ConsensusTrace;
  confidence: ConfidenceTrace;
  finalDecision: GovernanceDecision;
  finalReason: string;
  suggestedAction?: string;
}
