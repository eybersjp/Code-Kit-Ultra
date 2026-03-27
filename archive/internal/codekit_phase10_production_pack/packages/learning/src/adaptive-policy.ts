import type {
  AdaptivePolicyOverlay,
  AdapterReliability,
  FailurePattern,
} from "../../shared/src/phase10-types";

export function buildAdaptivePolicyOverlays(
  reliability: AdapterReliability[],
  patterns: FailurePattern[],
): AdaptivePolicyOverlay[] {
  return reliability.map((item) => {
    const adapterPatterns = patterns.filter((p) => p.adapterId === item.adapterId);
    const repeatedFailures = adapterPatterns.some((p) => p.occurrences >= 3);
    const requireApproval = item.reliabilityScore < 0.75 || repeatedFailures;
    const riskMultiplier =
      item.reliabilityScore < 0.7 ? 1.4 : item.reliabilityScore > 0.9 ? 0.9 : 1.0;
    const suggestedMaxRetries = item.reliabilityScore < 0.75 ? 1 : 2;

    return {
      adapterId: item.adapterId,
      riskMultiplier,
      suggestedMaxRetries,
      requireApproval,
      reason: requireApproval
        ? "Low reliability or repeated failures detected."
        : "Adapter is operating within expected range.",
      updatedAt: new Date().toISOString(),
    };
  });
}
