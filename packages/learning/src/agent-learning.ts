import { appendMemoryGraphEvent } from "../../observability/src/memory-graph";
import type { AgentProfile, RunOutcomeInput, SpecialistAgent } from "../../shared/src/governance-types";

const SUCCESS_BONUS = 0.02;
const FAILURE_PENALTY = 0.05;
const PARTIAL_DELTA = -0.01;
const MAX_SHIFT_PER_RUN = 0.05;
const MIN_RELIABILITY = 0.30;
const MAX_RELIABILITY = 0.95;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function boundedDelta(delta: number): number {
  return clamp(delta, -MAX_SHIFT_PER_RUN, MAX_SHIFT_PER_RUN);
}

export function updateAgentProfiles(
  profiles: Record<SpecialistAgent, AgentProfile>,
  outcome: RunOutcomeInput,
): Record<SpecialistAgent, AgentProfile> {
  const next = { ...profiles };
  const now = new Date().toISOString();

  for (const snapshot of outcome.agentDecisions) {
    const existing = next[snapshot.agent];
    if (!existing) continue;

    let delta = 0;

    if (outcome.result === "success") delta = SUCCESS_BONUS * snapshot.confidence;
    if (outcome.result === "failure") delta = -FAILURE_PENALTY * snapshot.confidence;
    if (outcome.result === "partial") delta = PARTIAL_DELTA * snapshot.confidence;
    if (outcome.rollbackOccurred) delta -= 0.02;
    if (outcome.humanOverride) delta -= 0.015;

    const updatedReliability = clamp(existing.reliability + boundedDelta(delta), MIN_RELIABILITY, MAX_RELIABILITY);
    const updated: AgentProfile = {
      ...existing,
      reliability: Number(updatedReliability.toFixed(4)),
      totalRuns: (existing.totalRuns ?? 0) + 1,
      successes: (existing.successes ?? 0) + (outcome.result === "success" ? 1 : 0),
      failures: (existing.failures ?? 0) + (outcome.result === "failure" ? 1 : 0),
      lastUpdatedAt: now,
    };
    next[snapshot.agent] = updated;

    appendMemoryGraphEvent({
      timestamp: now,
      runId: outcome.runId,
      type: "agent_reliability_updated",
      data: {
        agent: snapshot.agent,
        before: existing.reliability,
        after: updated.reliability,
        result: outcome.result,
      },
    });
  }

  return next;
}
