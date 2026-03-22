import type {
  ClarificationResult,
  GateDecision,
  GateStatus,
  Mode,
  SelectedSkill,
  Task,
} from "../../shared/src";
import { getModePolicy } from "./mode-controller";
import type { ModePolicy } from "./mode-controller";

export interface GateEvaluationInput {
  clarificationResult: ClarificationResult;
  plan: Task[];
  selectedSkills: SelectedSkill[];
  mode?: Mode;
}

export interface GateEvaluationResult {
  overallStatus: GateStatus;
  decisions: GateDecision[];
  summary: string;
}

const DEFAULT_MODE: Mode = "balanced";

export function evaluateGates(input: GateEvaluationInput): GateEvaluationResult {
  const mode = input.mode ?? DEFAULT_MODE;
  const policy = getModePolicy(mode);

  const decisions = [
    evaluateObjectiveClarityGate(input, policy),
    evaluateRequirementsCompletenessGate(input, policy),
    evaluatePlanReadinessGate(input, policy),
    evaluateSkillCoverageGate(input, policy),
    evaluateAmbiguityRiskGate(input, policy),
  ];

  const overallStatus = getOverallGateStatus(decisions);
  const summary = buildGateSummary(overallStatus, decisions);

  return {
    overallStatus,
    decisions,
    summary,
  };
}

export function getOverallGateStatus(decisions: GateDecision[]): GateStatus {
  if (decisions.some((decision) => decision.status === "blocked")) {
    return "blocked";
  }

  if (decisions.some((decision) => decision.status === "needs-review")) {
    return "needs-review";
  }

  return "pass";
}

function evaluateObjectiveClarityGate(input: GateEvaluationInput, policy: ModePolicy): GateDecision {
  const objective = input.clarificationResult.normalizedIdea || "";
  const category = input.clarificationResult.inferredProjectType || "";

  void policy; // policy reserved for future mode-gated thresholds

  if (!objective) {
    return createGateDecision({
      id: "objective-clarity",
      name: "Objective clarity",
      status: "blocked",
      reason: "No usable normalized objective was found in the clarification result.",
    });
  }

  if (!category || category === "unknown" || category === "unclear") {
    return createGateDecision({
      id: "objective-clarity",
      name: "Objective clarity",
      status: "needs-review",
      reason: "A project objective exists, but the project category is still unclear.",
    });
  }

  return createGateDecision({
    id: "objective-clarity",
    name: "Objective clarity",
    status: "pass",
    reason: `The run includes a usable objective and a detected project category (${category}).`,
  });
}

function evaluateRequirementsCompletenessGate(input: GateEvaluationInput, policy: ModePolicy): GateDecision {
  const questionCount = (input.clarificationResult.clarifyingQuestions || []).length;

  if (questionCount >= policy.gateThresholds.maxQuestionsBeforeBlock) {
    return createGateDecision({
      id: "requirements-completeness",
      name: "Requirements completeness",
      status: "blocked",
      reason: `The intake still has ${questionCount} open clarifying questions, which is too many for a safe run in ${policy.mode} mode.`,
    });
  }

  if (questionCount >= policy.gateThresholds.maxQuestionsBeforeReview) {
    return createGateDecision({
      id: "requirements-completeness",
      name: "Requirements completeness",
      status: "needs-review",
      reason: `The intake has ${questionCount} open clarifying questions, so the requirements are not fully settled yet.`,
    });
  }

  return createGateDecision({
    id: "requirements-completeness",
    name: "Requirements completeness",
    status: "pass",
    reason: `The intake has an acceptable number of open questions (${questionCount}) for ${policy.mode} mode.`,
  });
}

function evaluatePlanReadinessGate(input: GateEvaluationInput, policy: ModePolicy): GateDecision {
  const tasks = input.plan;
  const hasDependencies = tasks.some((task) => Array.isArray(task.dependencies) && task.dependencies.length > 0);

  if (tasks.length === 0) {
    return createGateDecision({
      id: "plan-readiness",
      name: "Plan readiness",
      status: "blocked",
      reason: "No plan tasks were generated for this run.",
    });
  }

  if (tasks.length < policy.gateThresholds.minimumPlanTasks || !hasDependencies) {
    return createGateDecision({
      id: "plan-readiness",
      name: "Plan readiness",
      status: "needs-review",
      reason: `The plan has ${tasks.length} task(s) and ${hasDependencies ? "does" : "does not"} include explicit dependencies, so execution readiness is partial.`,
    });
  }

  return createGateDecision({
    id: "plan-readiness",
    name: "Plan readiness",
    status: "pass",
    reason: `The plan contains ${tasks.length} tasks with explicit sequencing and is ready for downstream execution.`,
  });
}

function evaluateSkillCoverageGate(input: GateEvaluationInput, policy: ModePolicy): GateDecision {
  const skills = input.selectedSkills;
  const specialistSkills = skills.filter((skill) => {
    return skill.category !== "fallback";
  });

  if (skills.length === 0) {
    return createGateDecision({
      id: "skill-coverage",
      name: "Skill coverage",
      status: "blocked",
      reason: "No skills were selected for this run.",
    });
  }

  if (
    skills.length < policy.gateThresholds.minimumSelectedSkills ||
    specialistSkills.length === 0
  ) {
    return createGateDecision({
      id: "skill-coverage",
      name: "Skill coverage",
      status: "needs-review",
      reason: `The run selected ${skills.length} skill(s), but specialist coverage is still weak.`,
    });
  }

  return createGateDecision({
    id: "skill-coverage",
    name: "Skill coverage",
    status: "pass",
    reason: `The run selected ${skills.length} skill(s), including ${specialistSkills.length} specialist skill(s).`,
  });
}

function evaluateAmbiguityRiskGate(input: GateEvaluationInput, policy: ModePolicy): GateDecision {
  const assumptions = (input.clarificationResult.assumptions || []).length;
  const questionCount = (input.clarificationResult.clarifyingQuestions || []).length;
  const ambiguitySignal = questionCount;

  if (ambiguitySignal >= policy.gateThresholds.ambiguityBlockThreshold) {
    return createGateDecision({
      id: "ambiguity-risk",
      name: "Ambiguity risk",
      status: "blocked",
      reason: "Ambiguity is too high for safe progression.",
    });
  }

  if (assumptions > 6 || ambiguitySignal >= policy.gateThresholds.ambiguityReviewThreshold) {
    return createGateDecision({
      id: "ambiguity-risk",
      name: "Ambiguity risk",
      status: "needs-review",
      reason: `The run currently depends on ${assumptions} assumptions and ${questionCount} open questions, which increases ambiguity risk.`,
    });
  }

  return createGateDecision({
    id: "ambiguity-risk",
    name: "Ambiguity risk",
    status: "pass",
    reason: "Ambiguity remains within acceptable limits for the current mode.",
  });
}

function createGateDecision(params: {
  id: string;
  name: string;
  status: GateStatus;
  reason: string;
}): GateDecision {
  return {
    gate: params.id,
    status: params.status,
    reason: params.reason,
    shouldPause: params.status !== "pass",
  };
}

function buildGateSummary(overallStatus: GateStatus, decisions: GateDecision[]): string {
  const counts = decisions.reduce(
    (accumulator, decision) => {
      accumulator[decision.status] += 1;
      return accumulator;
    },
    { pass: 0, "needs-review": 0, blocked: 0, fail: 0, pending: 0 } as Record<GateStatus, number>,
  );

  return `Gate result: ${overallStatus}. Pass=${counts.pass}, Needs review=${counts["needs-review"]}, Blocked=${counts.blocked}.`;
}
