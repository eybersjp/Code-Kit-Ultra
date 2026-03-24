import { updateAgentProfiles } from "./agent-learning";
import { createConstraintSuggestions } from "./constraint-learning";
import { recordRunOutcome } from "./outcome-engine";
import { buildLearningReportJson, buildLearningReportMarkdown } from "./reporting";
import { updateSkillStats } from "./skill-learning";
import { loadLearningState, saveLearningReports, saveLearningState, savePolicyDiff } from "./storage";
import { evolveThresholdPolicy } from "./threshold-learning";
import type { LearningCycleResult, LearningState, RunOutcomeInput } from "../../shared/src/governance-types";

export { loadLearningState, recordRunOutcome };

export function applyLearningCycle(params: {
  state: LearningState;
  outcome: RunOutcomeInput;
}): LearningCycleResult {
  const agentProfiles = updateAgentProfiles(params.state.agentProfiles, params.outcome);
  const threshold = evolveThresholdPolicy(params.state.thresholdPolicy, params.outcome);
  const skillStats = updateSkillStats(params.state.skillStats, params.outcome);
  const constraintSuggestions = createConstraintSuggestions(params.outcome);

  const updatedState: LearningState = {
    agentProfiles,
    thresholdPolicy: threshold.policy,
    skillStats,
  };

  const summary = [
    `Processed outcome for ${params.outcome.runId}.`,
    `Updated ${Object.keys(agentProfiles).length} agent profiles.`,
    `Policy changes: ${Object.keys(threshold.diff).length}.`,
    `Constraint suggestions: ${constraintSuggestions.length}.`,
    `Tracked skills: ${Object.keys(skillStats).length}.`,
  ].join(" ");

  const result: LearningCycleResult = {
    updatedState,
    policyDiff: threshold.diff,
    constraintSuggestions,
    summary,
  };

  saveLearningState(updatedState);
  savePolicyDiff(result.policyDiff);
  saveLearningReports(buildLearningReportJson(updatedState, result), buildLearningReportMarkdown(result));

  return result;
}
