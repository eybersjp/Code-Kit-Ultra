import type { RunReport, UserInput, TaskType } from "../../shared/src/types";
import { deriveAssumptions, generateClarifyingQuestions } from "./intake";
import { trimQuestionsByMode } from "./mode-controller";
import { buildInitialPlan } from "./planner";
import { selectSkills } from "../../skill-engine/src/selector";
import { evaluateGate } from "../../gate-manager/src/index";
import { selectAdapter } from "../../adapters/src/router";
import { updateMemoryFromRun } from "../../memory/src/run-store";

export async function runVerticalSlice(input: UserInput): Promise<RunReport> {
  const assumptions = deriveAssumptions(input);
  const clarifyingQuestions = trimQuestionsByMode(generateClarifyingQuestions(input), input.mode);
  const plan = buildInitialPlan(input);
  const selectedSkills = selectSkills(input.idea);

  const taskTypes = Array.from(new Set(plan.map((p) => p.taskType).concat(selectedSkills.map((s) => s.taskType)))) as TaskType[];
  const routes = [];
  for (const taskType of taskTypes) {
    routes.push(await selectAdapter(taskType));
  }

  const gates = [
    evaluateGate("clarity", input.mode, clarifyingQuestions.some((q) => q.blocking) ? "needs-review" : "pass", clarifyingQuestions.some((q) => q.blocking) ? "Blocking ambiguity exists." : "Idea is sufficiently clear."),
    evaluateGate("architecture", input.mode, "pass", "Architecture gate passes for current vertical slice."),
    evaluateGate("deployment", input.mode, input.dryRun ? "needs-review" : "pass", input.dryRun ? "Dry-run stops before real deployment." : "Deployment path not blocked.")
  ];

  const summary = `Mode: ${input.mode}. Plan tasks: ${plan.length}. Skills: ${selectedSkills.length}. Routes: ${routes.length}. Gates: ${gates.length}.`;
  const report: RunReport = { input, assumptions, clarifyingQuestions, plan, selectedSkills, routes, gates, summary, createdAt: new Date().toISOString() };
  updateMemoryFromRun(report);
  return report;
}