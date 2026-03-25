import type { FailurePattern, RunOutcome } from "../../shared/src/phase10-types";

function patternId(adapterId: string, failureType: string): string {
  return `${adapterId}::${failureType}`.toLowerCase();
}

function defaultFixSuggestion(adapterId: string, failureType: string): string {
  if (adapterId === "terminal") {
    return "Check command allowlist, working directory, and environment variables.";
  }
  if (adapterId === "github") {
    return "Validate branch state, auth token, and remote permissions.";
  }
  return `Review adapter input and verify expected resource state for ${failureType}.`;
}

export function updatePatterns(existing: FailurePattern[], outcome: RunOutcome): FailurePattern[] {
  if (outcome.success || !outcome.dominantFailureType) {
    return existing;
  }

  const adapterId = outcome.adaptersUsed[0] ?? "unknown";
  const id = patternId(adapterId, outcome.dominantFailureType);
  const found = existing.find((x) => x.id === id);

  if (!found) {
    return [
      ...existing,
      {
        id,
        adapterId,
        failureType: outcome.dominantFailureType,
        fixSuggestion: defaultFixSuggestion(adapterId, outcome.dominantFailureType),
        confidence: 0.55,
        occurrences: 1,
        lastSeenAt: new Date().toISOString(),
      },
    ];
  }

  found.occurrences += 1;
  found.confidence = Number(Math.min(0.95, found.confidence + 0.05).toFixed(3));
  found.lastSeenAt = new Date().toISOString();
  return existing;
}
