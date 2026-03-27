import type { ClarificationResult, GateDecision, GateStatus, Mode, SelectedSkill, Task } from "../../shared/src";
import { getModePolicy } from "./mode-controller";

export interface GateEvaluationInput {
  clarificationResult: ClarificationResult;
  tasks: Task[];
  selectedSkills: SelectedSkill[];
  mode?: Mode;
}

export interface GateEvaluationResult {
  decisions: GateDecision[];
  overallStatus: GateStatus;
}

function worstStatus(statuses: GateStatus[]): GateStatus {
  if (statuses.includes("blocked")) return "blocked";
  if (statuses.includes("needs-review")) return "needs-review";
  return "pass";
}

export function evaluateGates(input: GateEvaluationInput): GateEvaluationResult {
  const policy = getModePolicy(input.mode ?? "balanced");
  const questions = input.clarificationResult.clarifyingQuestions?.length ?? 0;
  const assumptions = input.clarificationResult.assumptions?.length ?? 0;
  const tasks = input.tasks.length;
  const skills = input.selectedSkills.length;
  const objective = input.clarificationResult.normalizedObjective?.trim() ?? "";

  const decisions: GateDecision[] = [];

  decisions.push({
    id: "objective-clarity",
    name: "Objective Clarity",
    status: objective.length < 8 ? "blocked" : "pass",
    reason: objective.length < 8 ? "The objective is too short or unclear." : "A usable objective is present.",
  } as GateDecision);

  let requirementsStatus: GateStatus = "pass";
  if (questions >= policy.gateThresholds.maxQuestionsBeforeBlock) {
    requirementsStatus = "blocked";
  } else if (questions >= policy.gateThresholds.maxQuestionsBeforeReview) {
    requirementsStatus = "needs-review";
  }
  decisions.push({
    id: "requirements",
    name: "Requirements",
    status: requirementsStatus,
    reason:
      requirementsStatus === "pass"
        ? "Requirements are sufficiently scoped for a first-pass plan."
        : requirementsStatus === "needs-review"
        ? `There are still ${questions} open clarifying questions.`
        : `Too many unanswered clarifying questions remain (${questions}).`,
  } as GateDecision);

  const planStatus: GateStatus = tasks >= policy.gateThresholds.minimumPlanTasks ? "pass" : "needs-review";
  decisions.push({
    id: "plan-readiness",
    name: "Plan Readiness",
    status: planStatus,
    reason:
      planStatus === "pass"
        ? `The plan contains ${tasks} tasks, which meets the mode threshold.`
        : `The plan only contains ${tasks} tasks and may be too shallow.`,
  } as GateDecision);

  const skillStatus: GateStatus = skills >= policy.gateThresholds.minimumSelectedSkills ? "pass" : "needs-review";
  decisions.push({
    id: "skill-coverage",
    name: "Skill Coverage",
    status: skillStatus,
    reason:
      skillStatus === "pass"
        ? `Selected skill coverage is adequate (${skills} skill(s)).`
        : `Selected skill coverage is thin (${skills} skill(s)).`,
  } as GateDecision);

  const ambiguitySignal = questions + Math.max(0, assumptions - 2);
  let ambiguityStatus: GateStatus = "pass";
  if (ambiguitySignal >= policy.gateThresholds.ambiguityBlockThreshold) {
    ambiguityStatus = "blocked";
  } else if (ambiguitySignal >= policy.gateThresholds.ambiguityReviewThreshold) {
    ambiguityStatus = "needs-review";
  }
  decisions.push({
    id: "ambiguity-risk",
    name: "Ambiguity Risk",
    status: ambiguityStatus,
    reason:
      ambiguityStatus === "pass"
        ? "Ambiguity is within acceptable range for this mode."
        : ambiguityStatus === "needs-review"
        ? "Ambiguity is elevated and should be reviewed before deeper execution."
        : "Ambiguity is too high for safe progression.",
  } as GateDecision);

  return {
    decisions,
    overallStatus: worstStatus(decisions.map((decision) => decision.status as GateStatus)),
  };
}
