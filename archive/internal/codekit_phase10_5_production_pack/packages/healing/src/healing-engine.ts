import fs from "node:fs";
import path from "node:path";
import type {
  HealingAttempt,
  HealingContext,
  HealingPolicy,
  HealingRisk,
  HealingStrategy,
} from "../../shared/src/phase10_5-types";
import { classifyFailure } from "./failure-classifier";
import { findCandidateStrategies } from "./healing-strategy-registry";
import { loadHealingAttempts, saveHealingAttempts, updateHealingStats } from "./healing-store";
import { revalidateAfterHeal } from "./revalidation";

function loadHealingPolicy(): HealingPolicy {
  const file = path.resolve("config/healing-policy.json");
  return JSON.parse(fs.readFileSync(file, "utf-8")) as HealingPolicy;
}

function rankStrategies(strategies: HealingStrategy[]): HealingStrategy[] {
  const riskOrder: Record<HealingRisk, number> = { low: 0, medium: 1, high: 2 };
  return [...strategies].sort((a, b) => riskOrder[a.risk] - riskOrder[b.risk]);
}

function requiresApproval(strategy: HealingStrategy, policy: HealingPolicy): boolean {
  if (policy.mode === "observe") return false;
  if (policy.approvalRequiredForStrategies.includes(strategy.id)) return true;
  if (!policy.allowAutoApplyForRisk.includes(strategy.risk)) return true;
  return policy.mode !== "auto" || !strategy.autoApply;
}

export async function attemptHealing(input: HealingContext): Promise<HealingAttempt> {
  const policy = loadHealingPolicy();
  const classification = classifyFailure(input.errorMessage, input.adapterId);
  const candidates = rankStrategies(findCandidateStrategies(classification.failureType, input.adapterId));

  const attempt: HealingAttempt = {
    id: `heal-${Date.now()}`,
    runId: input.runId,
    stepId: input.stepId,
    adapterId: input.adapterId,
    failureType: classification.failureType,
    candidateStrategyIds: candidates.map((x) => x.id),
    status: "planned",
    approvalRequired: false,
    startedAt: new Date().toISOString(),
    summary: classification.reason,
  };

  const attempts = loadHealingAttempts(input.runId);
  attempts.push(attempt);
  saveHealingAttempts(input.runId, attempts);

  if (!policy.enabled || candidates.length === 0) {
    attempt.status = "escalated";
    attempt.summary = candidates.length === 0
      ? `No healing strategy found for ${classification.failureType}.`
      : "Healing disabled by policy.";
    attempt.endedAt = new Date().toISOString();
    saveHealingAttempts(input.runId, attempts);
    return attempt;
  }

  if (policy.mode === "observe") {
    attempt.status = "escalated";
    attempt.summary = `Observe mode: ${classification.failureType} classified, no repair applied.`;
    attempt.endedAt = new Date().toISOString();
    saveHealingAttempts(input.runId, attempts);
    return attempt;
  }

  const chosen = candidates[0];
  attempt.selectedStrategyId = chosen.id;
  attempt.approvalRequired = requiresApproval(chosen, policy);

  if (attempt.approvalRequired) {
    attempt.status = "awaiting-approval";
    attempt.summary = `Healing strategy ${chosen.id} requires approval.`;
    attempt.endedAt = new Date().toISOString();
    saveHealingAttempts(input.runId, attempts);
    return attempt;
  }

  const started = Date.now();
  const result = await chosen.apply(input);
  const revalidation = result.requiresReverification
    ? await revalidateAfterHeal(input)
    : { success: true, summary: "No revalidation requested." };
  const durationMs = Date.now() - started;
  updateHealingStats(chosen.id, Boolean(result.success && revalidation.success), durationMs);

  attempt.result = result;
  attempt.status = result.success && revalidation.success ? "verified" : "failed";
  attempt.summary = `${result.notes ?? "Repair attempted."} Revalidation: ${revalidation.summary}`;
  attempt.endedAt = new Date().toISOString();
  saveHealingAttempts(input.runId, attempts);

  return attempt;
}
