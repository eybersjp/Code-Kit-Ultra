export type RiskLevel = "low" | "medium" | "high";
export type OutcomeResult = "success" | "partial" | "failure";
export type SpecialistAgent = "planner" | "builder" | "reviewer" | "security";
export type SpecialistDecision = "approve" | "needs-review" | "reject";

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

export interface AgentProfile {
  agent: SpecialistAgent;
  baseWeight: number;
  reliability: number;
  totalRuns: number;
  successes: number;
  failures: number;
  lastUpdatedAt: string;
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
