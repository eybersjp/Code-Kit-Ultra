import type { Mode, RunReport } from "../../shared/src";
import { recordRun } from "../../memory/src";
import { runIntake } from "./intake";
import { evaluateGates } from "./gate-manager";
import { getModePolicy } from "./mode-controller";
import { buildPlanFromClarification } from "./planner";
import { selectSkills } from "../../skill-engine/src";

export interface RunVerticalSliceInput {
  idea: string;
  mode?: Mode;
  dryRun?: boolean;
}

export interface RunVerticalSliceResult {
  report: RunReport;
  artifactDirectory: string;
  artifactReportPath: string;
  memoryPath: string;
  overallGateStatus: string;
}

export function runVerticalSlice(input: RunVerticalSliceInput): RunVerticalSliceResult {
  const mode = input.mode ?? "balanced";
  const policy = getModePolicy(mode);
  const intakeResult = runIntake({ idea: input.idea, mode });
  const plan = buildPlanFromClarification(intakeResult);
  const selectedSkills = selectSkills({
    clarificationResult: intakeResult,
    tasks: plan,
  });
  const gateResult = evaluateGates({
    clarificationResult: intakeResult,
    tasks: plan,
    selectedSkills,
    mode,
  });

  const report: RunReport = {
    createdAt: new Date().toISOString(),
    summary: `${policy.label} mode run completed with overall status: ${gateResult.overallStatus}.`,
    input: {
      idea: input.idea,
      mode,
      dryRun: Boolean(input.dryRun),
    },
    intakeResult,
    plan,
    selectedSkills,
    gates: gateResult.decisions,
    overallGateStatus: gateResult.overallStatus,
  } as RunReport;

  const persisted = recordRun(report);

  return {
    report,
    artifactDirectory: persisted.artifactDirectory,
    artifactReportPath: persisted.artifactReportPath,
    memoryPath: persisted.memoryPath,
    overallGateStatus: gateResult.overallStatus,
  };
}
