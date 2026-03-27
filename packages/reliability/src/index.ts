import type { RunOutcome, AdapterReliability } from "../../shared/src/phase10-types";

export class ReliabilityScorer {
  static update(adapterId: string, outcome: RunOutcome): AdapterReliability {
    console.log(`[ReliabilityScorer] Updating score for adapter ${adapterId}...`);
    
    // Simplified logic: calculate moving average
    const totalRuns = 1; // Placeholder
    const successRate = outcome.success ? 1.0 : 0.0;
    const reliabilityScore = successRate * 0.8 + (1.0 / (outcome.retryCount + 1)) * 0.2;

    const reliability: AdapterReliability = {
      adapterId,
      successRate,
      avgRetries: outcome.retryCount,
      reliabilityScore,
      totalRuns,
      updatedAt: new Date().toISOString(),
    };

    console.log(`[ReliabilityScorer] New score for ${adapterId}: ${reliability.reliabilityScore.toFixed(2)}`);
    return reliability;
  }

  static getReliability(adapterId: string): AdapterReliability | undefined {
    // Placeholder
    return undefined;
  }
}
