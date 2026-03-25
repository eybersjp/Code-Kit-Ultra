import type { HealingStrategyStats } from "../../shared/src/phase10_5-types";
import { loadHealingStats } from "../../healing/src/healing-store";

export function getTopHealingStrategies(limit = 5): HealingStrategyStats[] {
  return [...loadHealingStats()]
    .sort((a, b) => b.successRate - a.successRate || b.attempts - a.attempts)
    .slice(0, limit);
}
