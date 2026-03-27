import type {
  AdaptiveConsensusInput,
  AdaptiveConsensusPolicy,
  AdaptiveConsensusResult,
  AgentProfile,
  AgentVote,
  RiskLevel,
  VoteExplanation,
} from "../../shared/src/agent-consensus";
import { getDefaultAdaptivePolicy, getDefaultAgentProfiles } from "../../agents/src/profiles";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function resolvePolicy(overrides?: Partial<AdaptiveConsensusPolicy>): AdaptiveConsensusPolicy {
  return { ...getDefaultAdaptivePolicy(), ...(overrides ?? {}) };
}

function resolveProfiles(inputProfiles?: AgentProfile[]): AgentProfile[] {
  return inputProfiles?.length ? inputProfiles : getDefaultAgentProfiles();
}

function thresholdForRisk(risk: RiskLevel, policy: AdaptiveConsensusPolicy): number {
  if (risk === "high") return policy.thresholdHighRisk;
  if (risk === "medium") return policy.thresholdMediumRisk;
  return policy.thresholdLowRisk;
}

function getReliability(profile: AgentProfile): number {
  return clamp01(profile.reliability);
}

function getEffectiveWeight(
  profile: AgentProfile,
  vote: AgentVote,
  policy: AdaptiveConsensusPolicy,
): number {
  const reliabilityFactor = 1 + ((getReliability(profile) - 0.5) * 2) * policy.reliabilityInfluence;
  const confidenceFactor = 1 + ((clamp01(vote.confidence) - 0.5) * 2) * policy.confidenceInfluence;
  return Math.max(0.05, profile.baseWeight * reliabilityFactor * confidenceFactor);
}

function checkVeto(votes: AgentVote[], profiles: AgentProfile[], risk: RiskLevel, policy: AdaptiveConsensusPolicy) {
  for (const vote of votes) {
    const profile = profiles.find((p) => p.agent === vote.agent);
    if (!profile?.canVeto) continue;
    if (vote.decision !== "reject") continue;

    const reviewerCanVeto = vote.agent === "reviewer" && policy.reviewerVetoAtRisk.includes(risk);
    const securityCanVeto = vote.agent === "security" && policy.securityVetoAtRisk.includes(risk);

    if (reviewerCanVeto || securityCanVeto) {
      return { vetoApplied: true as const, vetoBy: vote.agent };
    }
  }

  return { vetoApplied: false as const, vetoBy: undefined };
}

export function runAdaptiveConsensus(input: AdaptiveConsensusInput): AdaptiveConsensusResult {
  const policy = resolvePolicy(input.policy);
  const profiles = resolveProfiles(input.profiles);
  const threshold = thresholdForRisk(input.riskLevel, policy);

  const explanations: VoteExplanation[] = [];
  let totalWeight = 0;
  let approvalScore = 0;
  let reviewScore = 0;
  let rejectScore = 0;

  for (const vote of input.votes) {
    const profile = profiles.find((p) => p.agent === vote.agent);
    if (!profile) continue;

    const effectiveWeight = getEffectiveWeight(profile, vote, policy);
    totalWeight += effectiveWeight;

    if (vote.decision === "approve") approvalScore += effectiveWeight;
    if (vote.decision === "needs-review") reviewScore += effectiveWeight;
    if (vote.decision === "reject") rejectScore += effectiveWeight;

    explanations.push({
      agent: vote.agent,
      decision: vote.decision,
      effectiveWeight,
      confidence: clamp01(vote.confidence),
      reliability: getReliability(profile),
      weightedContribution: effectiveWeight,
      reason: vote.reason,
    });
  }

  const normalizedApproval = totalWeight > 0 ? approvalScore / totalWeight : 0;
  const normalizedReview = totalWeight > 0 ? reviewScore / totalWeight : 0;
  const normalizedReject = totalWeight > 0 ? rejectScore / totalWeight : 0;

  const veto = checkVeto(input.votes, profiles, input.riskLevel, policy);

  let finalDecision: AdaptiveConsensusResult["finalDecision"] = "needs-review";
  if (veto.vetoApplied) {
    finalDecision = "reject";
  } else if (normalizedApproval >= threshold && normalizedReject < 0.20) {
    finalDecision = "approve";
  } else if (normalizedReject >= 0.35) {
    finalDecision = "reject";
  } else {
    finalDecision = "needs-review";
  }

  const shouldPause = finalDecision !== "approve" || input.riskLevel !== "low";

  return {
    runId: input.runId,
    riskLevel: input.riskLevel,
    threshold,
    approvalScore: normalizedApproval,
    reviewScore: normalizedReview,
    rejectScore: normalizedReject,
    totalWeight,
    vetoApplied: veto.vetoApplied,
    vetoBy: veto.vetoBy,
    finalDecision,
    shouldPause,
    explanations,
    summary: `${finalDecision.toUpperCase()} | risk=${input.riskLevel} | approval=${normalizedApproval.toFixed(2)} | review=${normalizedReview.toFixed(2)} | reject=${normalizedReject.toFixed(2)}${veto.vetoApplied ? ` | veto=${veto.vetoBy}` : ""}`,
  };
}
