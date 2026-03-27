export type specialistagent =
  | "planner"
  | "builder"
  | "reviewer"
  | "security";

export type SpecialistDecision = "approve" | "needs-review" | "reject";
export type RiskLevel = "low" | "medium" | "high";
export type OutcomeResult = "success" | "partial" | "failure";

export interface AgentVote {
  agent: SpecialistAgent;
  decision: SpecialistDecision;
  confidence: number; // 0..1
  reason: string;
}

export interface AgentProfile {
  agent: SpecialistAgent;
  baseWeight: number;
  reliability: number; // 0..1 historical signal
  canVeto: boolean;
  totalRuns?: number;
  successes?: number;
  failures?: number;
  lastUpdatedAt?: string;
}

export interface AdaptiveConsensusPolicy {
  thresholdLowRisk: number;
  thresholdMediumRisk: number;
  thresholdHighRisk: number;
  reviewerVetoAtRisk: RiskLevel[];
  securityVetoAtRisk: RiskLevel[];
  reliabilityInfluence: number; // 0..1
  confidenceInfluence: number; // 0..1
}

export interface AdaptiveConsensusInput {
  runId: string;
  summary: string;
  riskLevel: RiskLevel;
  votes: AgentVote[];
  profiles?: AgentProfile[];
  policy?: Partial<AdaptiveConsensusPolicy>;
}

export interface VoteExplanation {
  agent: SpecialistAgent;
  decision: SpecialistDecision;
  effectiveWeight: number;
  confidence: number;
  reliability: number;
  weightedContribution: number;
  reason: string;
}

export interface AdaptiveConsensusResult {
  runId: string;
  riskLevel: RiskLevel;
  threshold: number;
  approvalScore: number;
  reviewScore: number;
  rejectScore: number;
  totalWeight: number;
  vetoApplied: boolean;
  vetoBy?: SpecialistAgent;
  finalDecision: "approve" | "needs-review" | "reject";
  shouldPause: boolean;
  explanations: VoteExplanation[];
  summary: string;
}

// Phase 6 Specific Types
export interface RunOutcomeInput {
  runId: string;
  result: OutcomeResult;
  issues: string[];
  humanOverride: boolean;
  rollbackOccurred: boolean;
  postExecutionScore: number;
  riskLevel: RiskLevel;
  selectedSkills: string[];
  agentDecisions: AgentDecisionSnapshot[];
}

export interface AgentDecisionSnapshot {
  agent: SpecialistAgent;
  decision: SpecialistDecision;
  confidence: number;
}

export interface ThresholdPolicy {
  lowRiskApprovalThreshold: number;
  mediumRiskApprovalThreshold: number;
  highRiskApprovalThreshold: number;
  maxShiftPerLearningCycle: number;
  minThreshold: number;
  maxThreshold: number;
  lastUpdatedAt: string;
}

export interface ConstraintLearningSuggestion {
  key: string;
  reason: string;
  suggestedAction: "tighten" | "relax" | "monitor";
  confidence: number;
}

export interface SkillLearningStat {
  skillId: string;
  runs: number;
  successes: number;
  failures: number;
  score: number;
  lastUsedAt: string;
}

export interface MemoryGraphEvent {
  timestamp: string;
  runId: string;
  type:
    | "outcome_recorded"
    | "agent_reliability_updated"
    | "threshold_policy_updated"
    | "constraint_suggestion_created"
    | "skill_stat_updated";
  data: Record<string, unknown>;
}

export interface LearningState {
  agentProfiles: Record<SpecialistAgent, AgentProfile>;
  thresholdPolicy: ThresholdPolicy;
  skillStats: Record<string, SkillLearningStat>;
}

export interface LearningCycleResult {
  updatedState: LearningState;
  policyDiff: Record<string, { before: number; after: number }>;
  constraintSuggestions: ConstraintLearningSuggestion[];
  summary: string;
}

// Export for compatibility
export type SpecialistAgent = specialistagent;
export type AgentDecision = SpecialistDecision;
