import type { AdapterExecution, RunReport, UserInput } from "../../shared/src/types";
import { userInputSchema } from "../../shared/src/validation";
import { deriveAssumptions, generateClarifyingQuestions } from "./intake";
import { trimQuestionsByMode } from "./mode-controller";
import { buildInitialPlan } from "./planner";
import { selectSkills } from "../../skill-engine/src/selector";
import { evaluateGate } from "../../gate-manager/src/index";
import { createMockAdapters } from "../../adapters/src/mock-adapters";
import { routeTaskToAdapter } from "../../shared/src/contracts-runtime";

export async function runVerticalSlice(input: UserInput): Promise<RunReport> {
  const parsed = userInputSchema.parse(input);

  const assumptions = deriveAssumptions(parsed);
  const allQuestions = generateClarifyingQuestions(parsed);
  const clarifyingQuestions = trimQuestionsByMode(allQuestions, parsed.mode);
  const plan = buildInitialPlan(parsed);
  const selectedSkills = selectSkills(parsed.idea);

  const gates = [
    evaluateGate(
      "clarity",
      parsed.mode,
      clarifyingQuestions.some((q) => q.blocking) ? "needs-review" : "pass",
      clarifyingQuestions.some((q) => q.blocking)
        ? "Blocking ambiguity exists."
        : "Idea is sufficiently clear for first-pass planning.",
    ),
    evaluateGate("architecture", parsed.mode, "pass", "Architecture gate passes for Phase 7 MVP scaffold."),
    evaluateGate("qa", parsed.mode, "pass", "Smoke-test layer is included in the MVP package."),
    evaluateGate("deployment", parsed.mode, "needs-review", "Deployment remains manual and mocked in this MVP."),
  ];

  const adapters = createMockAdapters();
  const adapterExecutions: AdapterExecution[] = [];

  for (const task of plan) {
    const adapter = routeTaskToAdapter(task, adapters);
    if (!adapter) {
      adapterExecutions.push({
        taskId: task.id,
        adapter: "NoAdapter",
        status: "skipped",
        output: `No compatible adapter found for taskType=${task.taskType}`,
      });
      continue;
    }

    const result = (await adapter.execute({ task })) as { message?: string };
    adapterExecutions.push({
      taskId: task.id,
      adapter: adapter.name,
      status: "simulated",
      output: result.message ?? "Execution simulated.",
    });
  }

  const shouldPause = gates.some((g) => g.shouldPause);
  const summary = [
    `Mode: ${parsed.mode}.`,
    `Generated ${plan.length} tasks.`,
    `Selected ${selectedSkills.length} skills.`,
    `Produced ${clarifyingQuestions.length} clarifying questions.`,
    `Defined ${gates.length} gates.`,
    `Simulated ${adapterExecutions.filter((x) => x.status === "simulated").length} adapter executions.`,
    `Pause required: ${shouldPause}.`,
  ].join(" ");

  return {
    input: parsed,
    assumptions,
    clarifyingQuestions,
    plan,
    selectedSkills,
    gates,
    adapterExecutions,
    summary,
    shouldPause,
    createdAt: new Date().toISOString(),
  };
}
