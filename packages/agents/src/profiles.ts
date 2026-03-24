import type { AgentProfile, AdaptiveConsensusPolicy } from "../../shared/src/governance-types";

export const DEFAULT_AGENT_PROFILES: Record<string, AgentProfile> = {
  planner: {
    agent: "planner",
    baseWeight: 1.0,
    reliability: 0.82,
    canVeto: false,
    totalRuns: 0,
    successes: 0,
    failures: 0,
    lastUpdatedAt: new Date(0).toISOString(),
  },
  builder: {
    agent: "builder",
    baseWeight: 1.0,
    reliability: 0.84,
    canVeto: false,
    totalRuns: 0,
    successes: 0,
    failures: 0,
    lastUpdatedAt: new Date(0).toISOString(),
  },
  reviewer: {
    agent: "reviewer",
    baseWeight: 1.1,
    reliability: 0.88,
    canVeto: true,
    totalRuns: 0,
    successes: 0,
    failures: 0,
    lastUpdatedAt: new Date(0).toISOString(),
  },
  security: {
    agent: "security",
    baseWeight: 1.2,
    reliability: 0.92,
    canVeto: true,
    totalRuns: 0,
    successes: 0,
    failures: 0,
    lastUpdatedAt: new Date(0).toISOString(),
  },
};

export const DEFAULT_ADAPTIVE_POLICY: AdaptiveConsensusPolicy = {
  thresholdLowRisk: 0.55,
  thresholdMediumRisk: 0.65,
  thresholdHighRisk: 0.75,
  reviewerVetoAtRisk: ["medium", "high"],
  securityVetoAtRisk: ["high"],
  reliabilityInfluence: 0.35,
  confidenceInfluence: 0.65,
};

export function getDefaultAgentProfiles(): AgentProfile[] {
  return Object.values(DEFAULT_AGENT_PROFILES);
}

export function getDefaultAdaptivePolicy(): AdaptiveConsensusPolicy {
  return DEFAULT_ADAPTIVE_POLICY;
}
