import type { AgentProfile, AdaptiveConsensusPolicy } from "../../shared/src/agent-consensus";

export function getDefaultAgentProfiles(): AgentProfile[] {
  return [
    { agent: "planner", baseWeight: 1.0, reliability: 0.82, canVeto: false },
    { agent: "builder", baseWeight: 1.0, reliability: 0.84, canVeto: false },
    { agent: "reviewer", baseWeight: 1.15, reliability: 0.88, canVeto: true },
    { agent: "security", baseWeight: 1.25, reliability: 0.92, canVeto: true },
  ];
}

export function getDefaultAdaptivePolicy(): AdaptiveConsensusPolicy {
  return {
    thresholdLowRisk: 0.55,
    thresholdMediumRisk: 0.65,
    thresholdHighRisk: 0.78,
    reviewerVetoAtRisk: ["high"],
    securityVetoAtRisk: ["medium", "high"],
    reliabilityInfluence: 0.35,
    confidenceInfluence: 0.65,
  };
}
