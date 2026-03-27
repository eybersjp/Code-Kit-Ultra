import type { RunReport, UserInput } from "../../shared/src/types";
import { deriveAssumptions, generateClarifyingQuestions } from "./intake";
import { trimQuestionsByMode } from "./mode-controller";
import { buildInitialPlan } from "./planner";
import { selectSkills } from "../../skill-engine/src/selector";
import { evaluateGate } from "../../gate-manager/src/index";

export function runVerticalSlice(input: UserInput): RunReport {
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
      "Architecture gate passes for vertical-slice scaffold."
    ),
    evaluateGate(
      "deployment",
      input.mode,
      "needs-review",
      "Deployment should remain manual in first vertical slice."
    )
  ];

  const summary = [
    `Mode: ${input.mode}`,
    `Generated ${plan.length} tasks.`,
    `Selected ${selectedSkills.length} skills.`,
    `Produced ${clarifyingQuestions.length} clarifying questions.`,
    `Defined ${gates.length} gates.`
  ].join(" ");

  return {
    input,
    assumptions,
    clarifyingQuestions,
    plan,
    selectedSkills,
    gates,
    summary,
    createdAt: new Date().toISOString()
  };
}
