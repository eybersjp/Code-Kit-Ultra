import type {
  ClarificationResult,
  GateDecision,
  GateStatus,
  Mode,
  SelectedSkill,
  Task,
} from "../../shared/src";

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

interface Thresholds {
  reviewQuestionCount: number;
  blockQuestionCount: number;
  minSkillsForPass: number;
  minTasksForPass: number;
  lowConfidenceRequiresReview: boolean;
}

const DEFAULT_MODE: Mode = "balanced";

const MODE_THRESHOLDS: Record<Mode, Thresholds> = {
  safe: {
    reviewQuestionCount: 2,
    blockQuestionCount: 6,
    minSkillsForPass: 3,
    minTasksForPass: 5,
    lowConfidenceRequiresReview: true,
  },
  balanced: {
    reviewQuestionCount: 3,
    blockQuestionCount: 7,
    minSkillsForPass: 2,
    minTasksForPass: 4,
    lowConfidenceRequiresReview: true,
  },
  god: {
    reviewQuestionCount: 5,
    blockQuestionCount: 9,
    minSkillsForPass: 1,
    minTasksForPass: 3,
    lowConfidenceRequiresReview: false,
  },
};

type GateFactoryInput = GateEvaluationInput & { mode: Mode; thresholds: Thresholds };

export function evaluateGates(input: GateEvaluationInput): GateEvaluationResult {
  const mode = input.mode ?? DEFAULT_MODE;
  const thresholds = MODE_THRESHOLDS[mode];

  const decisions = [
    evaluateObjectiveClarityGate({ ...input, mode, thresholds }),
    evaluateRequirementsCompletenessGate({ ...input, mode, thresholds }),
    evaluatePlanReadinessGate({ ...input, mode, thresholds }),
    evaluateSkillCoverageGate({ ...input, mode, thresholds }),
    evaluateAmbiguityRiskGate({ ...input, mode, thresholds }),
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

function evaluateObjectiveClarityGate(input: GateFactoryInput): GateDecision {
  const objective = getNormalizedObjective(input.clarificationResult);
  const category = getProjectCategory(input.clarificationResult);

  if (!objective) {
    return createGateDecision({
      id: "objective-clarity",
      name: "Objective clarity",
      status: "blocked",
      reason: "No usable normalized objective was found in the clarification result.",
      recommendedAction: "Provide a clearer project idea before planning continues.",
    });
  }

  if (!category || category === "unknown" || category === "unclear") {
    return createGateDecision({
      id: "objective-clarity",
      name: "Objective clarity",
      status: "needs-review",
      reason: "A project objective exists, but the project category is still unclear.",
      recommendedAction: "Refine the idea so the system can classify the solution more confidently.",
    });
  }

  return createGateDecision({
    id: "objective-clarity",
    name: "Objective clarity",
    status: "pass",
    reason: `The run includes a usable objective and a detected project category (${category}).`,
    recommendedAction: "Proceed with planning and skill selection.",
  });
}

function evaluateRequirementsCompletenessGate(input: GateFactoryInput): GateDecision {
  const questionCount = getClarifyingQuestionCount(input.clarificationResult);
  const confidence = getConfidence(input.clarificationResult);

  if (questionCount >= input.thresholds.blockQuestionCount) {
    return createGateDecision({
      id: "requirements-completeness",
      name: "Requirements completeness",
      status: "blocked",
      reason: `The intake still has ${questionCount} open clarifying questions, which is too many for a safe run in ${input.mode} mode.`,
      recommendedAction: "Resolve the highest-priority open questions before continuing.",
    });
  }

  if (
    questionCount >= input.thresholds.reviewQuestionCount ||
    (input.thresholds.lowConfidenceRequiresReview && confidence !== null && confidence < 0.5)
  ) {
    const confidenceText =
      confidence === null ? "unknown confidence" : `confidence ${confidence.toFixed(2)}`;

    return createGateDecision({
      id: "requirements-completeness",
      name: "Requirements completeness",
      status: "needs-review",
      reason: `The intake has ${questionCount} open clarifying questions and ${confidenceText}, so the requirements are not fully settled yet.`,
      recommendedAction: "Review unanswered questions and confirm core scope assumptions.",
    });
  }

  return createGateDecision({
    id: "requirements-completeness",
    name: "Requirements completeness",
    status: "pass",
    reason: `The intake has an acceptable number of open questions (${questionCount}) for ${input.mode} mode.`,
    recommendedAction: "Proceed with the current assumptions and revisit details later if needed.",
  });
}

function evaluatePlanReadinessGate(input: GateFactoryInput): GateDecision {
  const tasks = input.plan;
  const hasDependencies = tasks.some((task) => Array.isArray(task.dependencies) && task.dependencies.length > 0);
  const hasPendingTasks = tasks.some((task) => task.status === "pending" || task.status === "not-started");

  if (tasks.length === 0) {
    return createGateDecision({
      id: "plan-readiness",
      name: "Plan readiness",
      status: "blocked",
      reason: "No plan tasks were generated for this run.",
      recommendedAction: "Generate a deterministic execution plan before continuing.",
    });
  }

  if (tasks.length < input.thresholds.minTasksForPass || !hasDependencies) {
    return createGateDecision({
      id: "plan-readiness",
      name: "Plan readiness",
      status: "needs-review",
      reason: `The plan has ${tasks.length} task(s) and ${hasDependencies ? "does" : "does not"} include explicit dependencies, so execution readiness is partial.`,
      recommendedAction: "Expand the plan and confirm task ordering before implementation.",
    });
  }

  return createGateDecision({
    id: "plan-readiness",
    name: "Plan readiness",
    status: hasPendingTasks ? "pass" : "needs-review",
    reason: hasPendingTasks
      ? `The plan contains ${tasks.length} tasks with explicit sequencing and is ready for downstream execution.`
      : "The plan exists, but task statuses do not clearly indicate future work.",
    recommendedAction: hasPendingTasks
      ? "Proceed to the next governance step."
      : "Normalize task statuses so execution state is easier to interpret.",
  });
}

function evaluateSkillCoverageGate(input: GateFactoryInput): GateDecision {
  const skills = input.selectedSkills;
  const specialistSkills = skills.filter((skill) => {
    const category = getSelectedSkillCategory(skill);
    return category !== null && category !== "general" && category !== "fallback";
  });

  if (skills.length === 0) {
    return createGateDecision({
      id: "skill-coverage",
      name: "Skill coverage",
      status: "blocked",
      reason: "No skills were selected for this run.",
      recommendedAction: "Run the selector and confirm the registry includes matching skills.",
    });
  }

  if (
    skills.length < input.thresholds.minSkillsForPass ||
    specialistSkills.length === 0
  ) {
    return createGateDecision({
      id: "skill-coverage",
      name: "Skill coverage",
      status: "needs-review",
      reason: `The run selected ${skills.length} skill(s), but specialist coverage is still weak.`,
      recommendedAction: "Add more domain-specific or implementation-specific skills before execution.",
    });
  }

  return createGateDecision({
    id: "skill-coverage",
    name: "Skill coverage",
    status: "pass",
    reason: `The run selected ${skills.length} skill(s), including ${specialistSkills.length} specialist skill(s).`,
    recommendedAction: "Proceed with the current skill set.",
  });
}

function evaluateAmbiguityRiskGate(input: GateFactoryInput): GateDecision {
  const assumptions = getAssumptionCount(input.clarificationResult);
  const questionCount = getClarifyingQuestionCount(input.clarificationResult);
  const confidence = getConfidence(input.clarificationResult);

  if (confidence !== null && confidence < 0.3 && questionCount >= input.thresholds.reviewQuestionCount) {
    return createGateDecision({
      id: "ambiguity-risk",
      name: "Ambiguity risk",
      status: "blocked",
      reason: "The intake has very low confidence and still contains several open questions, making assumptions too risky.",
      recommendedAction: "Clarify the problem statement before allowing execution to continue.",
    });
  }

  if (assumptions > 6 || questionCount >= input.thresholds.reviewQuestionCount) {
    return createGateDecision({
      id: "ambiguity-risk",
      name: "Ambiguity risk",
      status: "needs-review",
      reason: `The run currently depends on ${assumptions} assumptions and ${questionCount} open questions, which increases ambiguity risk.`,
      recommendedAction: "Review major assumptions and confirm the highest-impact constraints.",
    });
  }

  return createGateDecision({
    id: "ambiguity-risk",
    name: "Ambiguity risk",
    status: "pass",
    reason: "Ambiguity remains within acceptable limits for the current mode.",
    recommendedAction: "Proceed while recording assumptions in the run report.",
  });
}

function createGateDecision(params: {
  id: string;
  name: string;
  status: GateStatus;
  reason: string;
  recommendedAction: string;
}): GateDecision {
  return {
    id: params.id,
    name: params.name,
    status: params.status,
    reason: params.reason,
    recommendedAction: params.recommendedAction,
  } as GateDecision;
}

function buildGateSummary(overallStatus: GateStatus, decisions: GateDecision[]): string {
  const counts = decisions.reduce(
    (accumulator, decision) => {
      accumulator[decision.status] += 1;
      return accumulator;
    },
    { pass: 0, "needs-review": 0, blocked: 0 } as Record<GateStatus, number>,
  );

  return `Gate result: ${overallStatus}. Pass=${counts.pass}, Needs review=${counts["needs-review"]}, Blocked=${counts.blocked}.`;
}

function getNormalizedObjective(clarificationResult: ClarificationResult): string | null {
  const direct = getStringValue(clarificationResult as Record<string, unknown>, [
    "normalizedObjective",
    "objective",
    "normalizedIdea",
    "idea",
  ]);

  if (direct) {
    return direct;
  }

  const intakeSignals = getObjectValue(clarificationResult as Record<string, unknown>, ["signals", "intakeSignals"]);
  if (!intakeSignals) {
    return null;
  }

  return getStringValue(intakeSignals, ["normalizedObjective", "objective", "idea"]);
}

function getProjectCategory(clarificationResult: ClarificationResult): string | null {
  const direct = getStringValue(clarificationResult as Record<string, unknown>, [
    "projectCategory",
    "category",
    "projectType",
    "solutionCategory",
  ]);

  if (direct) {
    return direct;
  }

  const intakeSignals = getObjectValue(clarificationResult as Record<string, unknown>, ["signals", "intakeSignals"]);
  if (!intakeSignals) {
    return null;
  }

  return getStringValue(intakeSignals, ["projectCategory", "category", "projectType"]);
}

function getClarifyingQuestionCount(clarificationResult: ClarificationResult): number {
  const questions = getArrayValue(clarificationResult as Record<string, unknown>, [
    "clarifyingQuestions",
    "questions",
  ]);

  return questions.length;
}

function getAssumptionCount(clarificationResult: ClarificationResult): number {
  const assumptions = getArrayValue(clarificationResult as Record<string, unknown>, [
    "assumptions",
  ]);

  return assumptions.length;
}

function getConfidence(clarificationResult: ClarificationResult): number | null {
  const direct = getNumberValue(clarificationResult as Record<string, unknown>, ["confidence", "completenessScore"]);
  if (direct !== null) {
    return direct;
  }

  const intakeSignals = getObjectValue(clarificationResult as Record<string, unknown>, ["signals", "intakeSignals"]);
  if (!intakeSignals) {
    return null;
  }

  return getNumberValue(intakeSignals, ["confidence", "completenessScore"]);
}

function getSelectedSkillCategory(skill: SelectedSkill): string | null {
  return getStringValue(skill as Record<string, unknown>, ["category", "type", "group"]);
}

function getStringValue(source: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function getNumberValue(source: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

function getObjectValue(source: Record<string, unknown>, keys: string[]): Record<string, unknown> | null {
  for (const key of keys) {
    const value = source[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  }

  return null;
}

function getArrayValue(source: Record<string, unknown>, keys: string[]): unknown[] {
  for (const key of keys) {
    const value = source[key];
    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}
