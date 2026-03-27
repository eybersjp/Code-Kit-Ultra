import type { AdapterReliability, RunOutcome } from "../../shared/src/phase10-types";

export function rebuildReliability(outcomes: RunOutcome[]): AdapterReliability[] {
  const buckets = new Map<string, RunOutcome[]>();

  for (const outcome of outcomes) {
    for (const adapterId of outcome.adaptersUsed) {
      const list = buckets.get(adapterId) ?? [];
      list.push(outcome);
      buckets.set(adapterId, list);
    }
  }

  return Array.from(buckets.entries()).map(([adapterId, items]) => {
    const successes = items.filter((x) => x.success).length;
    const successRate = items.length === 0 ? 0 : successes / items.length;
    const avgRetries =
      items.length === 0 ? 0 : items.reduce((sum, x) => sum + x.retryCount, 0) / items.length;

    const qualityBoost =
      items.length === 0 ? 0 : items.reduce((sum, x) => sum + x.qualityScore, 0) / items.length;

    const reliabilityScore = Number(
      Math.max(0, Math.min(1, successRate * 0.6 + (1 - Math.min(avgRetries, 3) / 3) * 0.2 + qualityBoost * 0.2)).toFixed(3),
    );

    return {
      adapterId,
      successRate: Number(successRate.toFixed(3)),
      avgRetries: Number(avgRetries.toFixed(3)),
      reliabilityScore,
      totalRuns: items.length,
      updatedAt: new Date().toISOString(),
    };
  });
}
