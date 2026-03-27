import { evaluateGate } from "../../gate-manager/src/index";
import type { RunBundle, UserInput } from "../../shared/src/types";
import { createRunId } from "../../shared/src/id";
import { deriveAssumptions, generateClarifyingQuestions } from "./intake";
import { trimQuestionsByMode } from "./mode-controller";
import { buildInitialPlan } from "./planner";
import { selectSkills } from "../../skill-engine/src/selector";
import { buildMarkdownReport } from "./report-builder";

export function buildRunBundle(input: UserInput): RunBundle {
  const runId = createRunId();
  const createdAt = new Date().toISOString();
  const assumptions = deriveAssumptions(input);
  const clarifyingQuestions = trimQuestionsByMode(generateClarifyingQuestions(input), input.mode);
  const selectedSkills = selectSkills(input.idea);
  const tasks = buildInitialPlan(input);
  const summary = `Generated ${tasks.length} tasks for ${input.idea}`;

  const gates = [
    evaluateGate(
      "clarity",
      input.mode,
      clarifyingQuestions.some((q) => q.blocking) ? "needs-review" : "pass",
      clarifyingQuestions.some((q) => q.blocking)
        ? "Blocking ambiguity exists."
        : "Idea is sufficiently clear for first-pass planning.",
    ),
    evaluateGate("architecture", input.mode, "pass", "Execution architecture is valid for the Phase 8 MVP."),
    evaluateGate("qa", input.mode, "pass", "Smoke and execution-engine tests are included."),
    evaluateGate("deployment", input.mode, "needs-review", "External provider execution remains staged, not fully wired."),
  ];

  const bundle: RunBundle = {
    intake: {
      runId,
      createdAt,
      idea: input.idea,
      input,
      assumptions,
      clarifyingQuestions,
    },
    plan: {
      runId,
      createdAt,
      summary,
      selectedSkills,
      tasks,
    },
    gates,
    adapters: {
      runId,
      createdAt,
      executions: [],
    },
    executionLog: {
      runId,
      createdAt,
      steps: [],
    },
    state: {
      runId,
      createdAt,
      updatedAt: createdAt,
      currentStepIndex: 0,
      status: "planned",
      approvalRequired: false,
      approved: false,
    },
    reportMarkdown: "",
  };

  bundle.reportMarkdown = buildMarkdownReport(bundle);
  return bundle;
}
