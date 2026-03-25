import fs from "node:fs";
import path from "node:path";
import type { HealingAttempt, HealingStrategyStats } from "../../shared/src/phase10_5-types";

function runHealingPath(runId: string): string {
  return path.resolve(`.codekit/runs/${runId}/healing-log.json`);
}

const STATS_PATH = path.resolve(".codekit/healing/healing-stats.json");

export function loadHealingAttempts(runId: string): HealingAttempt[] {
  const file = runHealingPath(runId);
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, "utf-8")) as HealingAttempt[];
}

export function saveHealingAttempts(runId: string, attempts: HealingAttempt[]): void {
  const file = runHealingPath(runId);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(attempts, null, 2), "utf-8");
}

export function loadHealingStats(): HealingStrategyStats[] {
  if (!fs.existsSync(STATS_PATH)) return [];
  return JSON.parse(fs.readFileSync(STATS_PATH, "utf-8")) as HealingStrategyStats[];
}

export function saveHealingStats(stats: HealingStrategyStats[]): void {
  fs.mkdirSync(path.dirname(STATS_PATH), { recursive: true });
  fs.writeFileSync(STATS_PATH, JSON.stringify(stats, null, 2), "utf-8");
}

export function updateHealingStats(strategyId: string, success: boolean, durationMs: number): HealingStrategyStats[] {
  const stats = loadHealingStats();
  const found = stats.find((x) => x.strategyId === strategyId);

  if (!found) {
    stats.push({
      strategyId,
      attempts: 1,
      successes: success ? 1 : 0,
      successRate: success ? 1 : 0,
      avgRepairTimeMs: durationMs,
      updatedAt: new Date().toISOString(),
    });
  } else {
    const priorAttempts = found.attempts;
    found.attempts += 1;
    if (success) found.successes += 1;
    found.successRate = Number((found.successes / found.attempts).toFixed(3));
    found.avgRepairTimeMs = Number((((found.avgRepairTimeMs * priorAttempts) + durationMs) / found.attempts).toFixed(2));
    found.updatedAt = new Date().toISOString();
  }

  saveHealingStats(stats);
  return stats;
}
