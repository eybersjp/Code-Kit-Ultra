import { getHealingStrategies } from "../../../../packages/healing/src/healing-strategy-registry";
import { loadHealingAttempts, loadHealingStats } from "../../../../packages/healing/src/healing-store";

export function getHealingForRun(runId: string) {
  return loadHealingAttempts(runId);
}

export function getHealingAttempt(runId: string, attemptId: string) {
  return loadHealingAttempts(runId).find((x) => x.id === attemptId) ?? null;
}

export function getHealingStrategiesService() {
  return getHealingStrategies().map((x) => ({
    id: x.id,
    adapterId: x.adapterId,
    failureType: x.failureType,
    title: x.title,
    risk: x.risk,
    autoApply: x.autoApply,
  }));
}

export function getHealingStatsService() {
  return loadHealingStats();
}
