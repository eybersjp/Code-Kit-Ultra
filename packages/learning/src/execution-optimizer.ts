import type { OptimizationSuggestion } from "../../shared/src/phase10-types";
import type { LearningStore } from "../../shared/src/phase10-types";

export interface ExecutableTask {
  id: string;
  title: string;
  adapterId: string;
  retryLimit?: number;
}

export function optimizeTasks(
  tasks: ExecutableTask[],
  store: LearningStore,
): { tasks: ExecutableTask[]; suggestions: OptimizationSuggestion[] } {
  const suggestions: OptimizationSuggestion[] = [];
  const overlays = new Map(store.policyOverlays.map((x) => [x.adapterId, x]));
  const reliability = new Map(store.reliability.map((x) => [x.adapterId, x]));

  const optimized = tasks.map((task) => {
    const overlay = overlays.get(task.adapterId);
    const rel = reliability.get(task.adapterId);

    let next = { ...task };

    if (overlay) {
      next.retryLimit = overlay.suggestedMaxRetries;
      suggestions.push({
        id: `retry-${task.id}`,
        type: "retry-policy",
        summary: `Adjusted retry limit for ${task.adapterId}`,
        reason: overlay.reason,
        impact: overlay.requireApproval ? "high" : "medium",
      });
    }

    if (rel && rel.reliabilityScore < 0.75) {
      suggestions.push({
        id: `approval-${task.id}`,
        type: "approval",
        summary: `Force approval for weaker adapter ${task.adapterId}`,
        reason: `Reliability score is ${rel.reliabilityScore}.`,
        impact: "high",
      });
    }

    return next;
  });

  return { tasks: optimized, suggestions };
}
