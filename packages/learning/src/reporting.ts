import type { LearningCycleResult, LearningState } from "../../shared/src/governance-types";

export function buildLearningReportMarkdown(result: LearningCycleResult): string {
  const lines: string[] = [];
  lines.push("# Phase 6 Learning Report");
  lines.push("");
  lines.push(`Generated at: ${new Date().toISOString()}`);
  lines.push("");
  lines.push("## Summary");
  lines.push(result.summary);
  lines.push("");
  lines.push("## Policy Diff");
  if (Object.keys(result.policyDiff).length === 0) {
    lines.push("- No threshold changes in this cycle.");
  } else {
    for (const [key, value] of Object.entries(result.policyDiff)) {
      lines.push(`- ${key}: ${value.before} -> ${value.after}`);
    }
  }
  lines.push("");
  lines.push("## Constraint Suggestions");
  if (result.constraintSuggestions.length === 0) {
    lines.push("- No new suggestions.");
  } else {
    for (const s of result.constraintSuggestions) {
      lines.push(`- ${s.key}: ${s.suggestedAction} (${s.confidence}) — ${s.reason}`);
    }
  }
  lines.push("");
  lines.push("## Agent Profiles");
  for (const profile of Object.values(result.updatedState.agentProfiles)) {
    lines.push(`- ${profile.agent}: reliability=${profile.reliability}, runs=${profile.totalRuns}, success=${profile.successes}, failure=${profile.failures}`);
  }
  lines.push("");
  lines.push("## Skill Learning");
  const skillStats = Object.values(result.updatedState.skillStats).sort((a, b) => b.score - a.score);
  if (skillStats.length === 0) {
    lines.push("- No skill data yet.");
  } else {
    for (const stat of skillStats) {
      lines.push(`- ${stat.skillId}: score=${stat.score}, runs=${stat.runs}, success=${stat.successes}, failure=${stat.failures}`);
    }
  }
  return lines.join("\n");
}

export function buildLearningReportJson(state: LearningState, result: LearningCycleResult): unknown {
  return {
    generatedAt: new Date().toISOString(),
    thresholdPolicy: state.thresholdPolicy,
    agentProfiles: state.agentProfiles,
    skillStats: state.skillStats,
    policyDiff: result.policyDiff,
    constraintSuggestions: result.constraintSuggestions,
    summary: result.summary,
  };
}
