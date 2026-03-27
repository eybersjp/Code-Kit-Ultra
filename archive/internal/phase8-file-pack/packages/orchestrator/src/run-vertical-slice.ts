import { recordRun, type RecordedRunResult } from "../../../packages/memory/src";
import type {
  ClarificationResult,
  GateDecision,
  GateStatus,
  Mode,
  RunReport,
  SelectedSkill,
  Task,
  UserInput,
} from "../../../packages/shared/src";
import { runIntake } from "./intake";
import { buildPlanFromClarification } from "./planner";
import { evaluateGates } from "./gate-manager";
import { selectSkills } from "../../../packages/skill-engine/src";

export interface RunVerticalSliceInput {
  idea: string;
  mode?: Mode;
  dryRun?: boolean;
}

export interface RunVerticalSliceResult extends RecordedRunResult {
  report: RunReport;
  overallGateStatus: GateStatus;
}

interface GateEvaluationLike {
  decisions?: GateDecision[];
  gates?: GateDecision[];
  overallStatus?: GateStatus;
  finalStatus?: GateStatus;
  status?: GateStatus;
}

function normalizeMode(mode?: Mode): Mode {
  return mode === "safe" || mode === "god" || mode === "balanced"
    ? mode
    : "balanced";
}

function normalizeIdea(idea: string): string {
  return idea.trim().replace(/\s+/g, " ");
}

function buildUserInput(input: RunVerticalSliceInput): UserInput {
  return {
    idea: normalizeIdea(input.idea),
    mode: normalizeMode(input.mode),
    dryRun: Boolean(input.dryRun),
  } as UserInput;
}

function getGateDecisions(result: unknown): GateDecision[] {
  if (!result || typeof result !== "object") {
    return [];
  }

  const candidate = result as GateEvaluationLike;
  if (Array.isArray(candidate.decisions)) {
    return candidate.decisions;
  }

  if (Array.isArray(candidate.gates)) {
    return candidate.gates;
  }

  return [];
}

function getOverallGateStatus(result: unknown, decisions: GateDecision[]): GateStatus {
  if (result && typeof result === "object") {
    const candidate = result as GateEvaluationLike;
    const explicit = candidate.overallStatus ?? candidate.finalStatus ?? candidate.status;
    if (explicit === "pass" || explicit === "needs-review" || explicit === "blocked") {
      return explicit;
    }
  }

  if (decisions.some((decision) => decision.status === "blocked")) {
    return "blocked";
  }

  if (decisions.some((decision) => decision.status === "needs-review")) {
    return "needs-review";
  }

  return "pass";
}

function buildSummary(args: {
  input: UserInput;
  intakeResult: ClarificationResult;
  plan: Task[];
  selectedSkills: SelectedSkill[];
  gates: GateDecision[];
  overallGateStatus: GateStatus;
}): string {
  const blockingQuestions = args.intakeResult.clarifyingQuestions.filter((question) => question.blocking).length;
  const assumptions = args.intakeResult.assumptions.length;
  const projectType = args.intakeResult.inferredProjectType || "unknown";

  return [
    `Mode=${args.input.mode}`,
    `projectType=${projectType}`,
    `assumptions=${assumptions}`,
    `blockingQuestions=${blockingQuestions}`,
    `tasks=${args.plan.length}`,
    `skills=${args.selectedSkills.length}`,
    `gates=${args.gates.length}`,
    `overall=${args.overallGateStatus}`,
    args.input.dryRun ? "dryRun=true" : "dryRun=false",
  ].join(" | ");
}

function buildRunReport(args: {
  input: UserInput;
  intakeResult: ClarificationResult;
  plan: Task[];
  selectedSkills: SelectedSkill[];
  gates: GateDecision[];
  overallGateStatus: GateStatus;
}): RunReport {
  return {
    input: args.input,
    intakeResult: args.intakeResult,
    assumptions: args.intakeResult.assumptions,
    clarifyingQuestions: args.intakeResult.clarifyingQuestions,
    plan: args.plan,
    selectedSkills: args.selectedSkills,
    gates: args.gates,
    summary: buildSummary(args),
    createdAt: new Date().toISOString(),
    overallGateStatus: args.overallGateStatus,
  } as RunReport;
}

export function runVerticalSlice(input: RunVerticalSliceInput): RunVerticalSliceResult {
  const normalizedInput = buildUserInput(input);

  const intakeResult = runIntake(normalizedInput);
  const plan = buildPlanFromClarification(intakeResult);
  const selectedSkills = selectSkills({
    clarification: intakeResult,
    plan,
  });

  const gateEvaluation = evaluateGates({
    clarification: intakeResult,
    plan,
    selectedSkills,
    mode: normalizedInput.mode,
  });

  const gates = getGateDecisions(gateEvaluation);
  const overallGateStatus = getOverallGateStatus(gateEvaluation, gates);

  const report = buildRunReport({
    input: normalizedInput,
    intakeResult,
    plan,
    selectedSkills,
    gates,
    overallGateStatus,
  });

  const persisted = recordRun(report);

  return {
    report,
    overallGateStatus,
    ...persisted,
  };
}
