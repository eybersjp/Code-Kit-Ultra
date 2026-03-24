import { appendMemoryGraphEvent } from "../../observability/src/memory-graph";
import type { RunOutcomeInput, SkillLearningStat } from "../../shared/src/governance-types";

function scoreSkill(stat: SkillLearningStat): number {
  if (stat.runs === 0) return 0;
  return Number(((stat.successes - stat.failures * 0.75) / stat.runs).toFixed(4));
}

export function updateSkillStats(
  existing: Record<string, SkillLearningStat>,
  outcome: RunOutcomeInput,
): Record<string, SkillLearningStat> {
  const next = { ...existing };
  const now = new Date().toISOString();

  for (const skillId of outcome.selectedSkills) {
    const current = next[skillId] ?? {
      skillId,
      runs: 0,
      successes: 0,
      failures: 0,
      score: 0,
      lastUsedAt: now,
    };

    const updated: SkillLearningStat = {
      ...current,
      runs: current.runs + 1,
      successes: current.successes + (outcome.result === "success" ? 1 : 0),
      failures: current.failures + (outcome.result === "failure" ? 1 : 0),
      lastUsedAt: now,
      score: 0,
    };
    updated.score = scoreSkill(updated);
    next[skillId] = updated;

    appendMemoryGraphEvent({
      timestamp: now,
      runId: outcome.runId,
      type: "skill_stat_updated",
      data: updated as any,
    });
  }

  return next;
}
