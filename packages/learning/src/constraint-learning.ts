import { appendMemoryGraphEvent } from "../../observability/src/memory-graph";
import type { ConstraintLearningSuggestion, RunOutcomeInput } from "../../shared/src/governance-types";

export function createConstraintSuggestions(outcome: RunOutcomeInput): ConstraintLearningSuggestion[] {
  const suggestions: ConstraintLearningSuggestion[] = [];

  if (outcome.rollbackOccurred) {
    suggestions.push({
      key: "mutation-scope",
      reason: "Rollback indicates execution exceeded safe mutation boundaries.",
      suggestedAction: "tighten",
      confidence: 0.87,
    });
  }

  if (outcome.humanOverride) {
    suggestions.push({
      key: "approval-pauses",
      reason: "Human override indicates the autonomous decision required manual intervention.",
      suggestedAction: "monitor",
      confidence: 0.74,
    });
  }

  if (outcome.result === "failure" && outcome.issues.some((issue) => /shell|command|unsafe/i.test(issue))) {
    suggestions.push({
      key: "shell-pattern-blocklist",
      reason: "Failure was associated with an unsafe shell or command pattern.",
      suggestedAction: "tighten",
      confidence: 0.92,
    });
  }

  const now = new Date().toISOString();
  for (const suggestion of suggestions) {
    appendMemoryGraphEvent({
      timestamp: now,
      runId: outcome.runId,
      type: "constraint_suggestion_created",
      data: suggestion as any,
    });
  }

  return suggestions;
}
