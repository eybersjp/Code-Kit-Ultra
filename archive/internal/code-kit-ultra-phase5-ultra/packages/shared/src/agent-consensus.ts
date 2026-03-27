export type SpecialistAgent =
  | "planner"
  | "builder"
  | "reviewer"
  | "security";

export type AgentDecision = "approve" | "needs-review" | "reject";
export type RiskLevel = "low" | "medium" | "high";

export interface AgentVote {
  agent: SpecialistAgent;
  decision: AgentDecision;
  confidence: number; // 0..1
  reason: string;
}

export interface AgentProfile {
  agent: SpecialistAgent;
  baseWeight: number;
  reliability: number; // 0..1 historical signal
  canVeto: boolean;
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
  decision: AgentDecision;
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
