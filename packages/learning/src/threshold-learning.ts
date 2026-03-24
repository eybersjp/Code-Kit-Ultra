import { appendMemoryGraphEvent } from "../../observability/src/memory-graph";
import type { RunOutcomeInput, ThresholdPolicy } from "../../shared/src/governance-types";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function evolveThresholdPolicy(
  policy: ThresholdPolicy,
  outcome: RunOutcomeInput,
): { policy: ThresholdPolicy; diff: Record<string, { before: number; after: number }> } {
  const next = { ...policy };
  const diff: Record<string, { before: number; after: number }> = {};
  const shift = policy.maxShiftPerLearningCycle;

  const adjust = (key: keyof ThresholdPolicy, delta: number) => {
    if (typeof next[key] !== "number") return;
    const before = next[key] as number;
    const after = clamp(before + delta, policy.minThreshold, policy.maxThreshold);
    if (before !== after) {
      (next as any)[key] = Number(after.toFixed(4));
      diff[String(key)] = { before, after };
    }
  };

  if (outcome.result === "failure" || outcome.rollbackOccurred) {
    if (outcome.riskLevel === "high") adjust("highRiskApprovalThreshold", shift);
    if (outcome.riskLevel === "medium") adjust("mediumRiskApprovalThreshold", shift * 0.66);
    if (outcome.riskLevel === "low") adjust("lowRiskApprovalThreshold", shift * 0.5);
  }

  if (outcome.result === "success" && !outcome.humanOverride && !outcome.rollbackOccurred) {
    if (outcome.riskLevel === "medium") adjust("mediumRiskApprovalThreshold", -shift * 0.33);
    if (outcome.riskLevel === "low") adjust("lowRiskApprovalThreshold", -shift * 0.25);
  }

  next.lastUpdatedAt = new Date().toISOString();

  if (Object.keys(diff).length > 0) {
    appendMemoryGraphEvent({
      timestamp: next.lastUpdatedAt,
      runId: outcome.runId,
      type: "threshold_policy_updated",
      data: diff,
    });
  }

  return { policy: next, diff };
}
