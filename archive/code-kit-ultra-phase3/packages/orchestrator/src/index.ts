import type { AdapterExecution, RouteSelection, RunOptions, RunReport, UserInput } from "../../shared/src/types";
import { deriveAssumptions, generateClarifyingQuestions } from "./intake";
import { trimQuestionsByMode } from "./mode-controller";
import { buildInitialPlan } from "./planner";
import { selectSkills } from "../../skill-engine/src/selector";
import { evaluateGate } from "../../gate-manager/src/index";
import { selectAdapterForTask } from "../../adapters/src/router";
import { createRunPaths, loadMemory, saveRunReport, updateMemory } from "../../memory/src/run-store";
import { saveMarkdownReport } from "../../reporting/src/markdown";

export async function runVerticalSlice(input: UserInput, options: RunOptions = {}): Promise<RunReport> {
  const dryRun = options.dryRun ?? false;
  const paths = createRunPaths(options.outputDir);
  const memory = loadMemory(paths.memoryPath);

  const assumptions = deriveAssumptions(input);
  const allQuestions = generateClarifyingQuestions(input);
  const clarifyingQuestions = trimQuestionsByMode(allQuestions, input.mode);
  const plan = buildInitialPlan(input);
  const selectedSkills = selectSkills(input.idea);

  const gates = [
    evaluateGate(
      "clarity",
      input.mode,
      clarifyingQuestions.some((q) => q.blocking) ? "needs-review" : "pass",
      clarifyingQuestions.some((q) => q.blocking)
        ? "Blocking ambiguity exists."
        : "Idea is sufficiently clear for first-pass planning."
    ),
    evaluateGate(
      "architecture",
      input.mode,
      "pass",
      "Architecture gate passes for phase 3 scaffold."
    ),
    evaluateGate(
      "deployment",
      input.mode,
      "needs-review",
      dryRun ? "Dry-run mode prevents real deployment actions." : "Deployment remains manual in this phase."
    )
  ];

  const routeSelections: RouteSelection[] = [];
  const adapterExecutions: AdapterExecution[] = [];
  for (const task of plan) {
    const routed = selectAdapterForTask(task.taskType, memory);
    routeSelections.push({
      taskId: task.id,
      taskType: task.taskType,
      selectedAdapter: routed.adapter.name,
      policyReason: routed.reason
    });

    const result = await routed.adapter.execute({ task, dryRun, preferredMode: memory.preferredMode });
    adapterExecutions.push({
      adapter: routed.adapter.name,
      taskId: task.id,
      taskType: task.taskType,
      resultSummary: result.summary
    });
  }

  const summary = [
    `Mode: ${input.mode}`,
    `Dry run: ${dryRun}`,
    `Generated ${plan.length} tasks.`,
    `Selected ${selectedSkills.length} skills.`,
    `Produced ${clarifyingQuestions.length} clarifying questions.`,
    `Defined ${gates.length} gates.`,
    `Executed ${adapterExecutions.length} adapter steps.`
  ].join(" ");

  const report: RunReport = {
    input,
    assumptions,
    clarifyingQuestions,
    plan,
    selectedSkills,
    gates,
    adapterExecutions,
    routeSelections,
    summary,
    createdAt: new Date().toISOString(),
    dryRun,
    outputDir: paths.baseDir,
    paths
  };

  saveRunReport(report, paths);
  saveMarkdownReport(report, paths);
  updateMemory(report, paths.memoryPath);
  return report;
}
