import type { Mode, RunReport } from "../../shared/src";
import { recordRun } from "../../memory/src";
import { getModePolicy } from "./mode-controller";
import { runOrchestrationStep } from "./phase-engine";

export interface RunVerticalSliceInput {
  idea: string;
  mode?: Mode;
  dryRun?: boolean;
  approvedGates?: string[];
  currentRun?: RunReport; // New: support continuing an existing run
}

export interface RunVerticalSliceResult {
  report: RunReport;
  artifactDirectory: string;
  artifactReportPath: string;
  memoryPath: string;
  overallGateStatus: string;
  currentPhase: string;
}

export async function runVerticalSlice(input: RunVerticalSliceInput): Promise<RunVerticalSliceResult> {
  const mode = input.mode ?? "builder";
  const policy = getModePolicy(mode);

  let report: RunReport = input.currentRun || {
    createdAt: new Date().toISOString(),
    summary: `${policy.label} mode run initiated.`,
    input: {
      idea: input.idea,
      mode,
      dryRun: Boolean(input.dryRun),
    },
    assumptions: [],
    clarifyingQuestions: [],
    plan: [],
    selectedSkills: [],
    gates: [],
    approvedGates: input.approvedGates ?? [],
    overallGateStatus: "pending",
    currentPhase: "intake",
    completedPhases: [],
    status: "in-progress",
  };

  // Execution Logic based on Mode
  // Expert mode: One step at a time
  // Turbo mode: Loop until blocked or finished
  // Builder/Pro: Balanced
  
  const shouldContinue = (rep: RunReport) => {
    if (rep.status === "blocked" || rep.status === "awaiting-approval" || rep.status === "success") return false;
    if (mode === "expert") return false; // Stop after every step in expert mode
    return true;
  };

  // Run the first step
  let stepResult = await runOrchestrationStep(report);
  report = stepResult;

  // Continue if autonomous
  if (mode !== "expert") {
    while (!stepResult.isFinished && report.status === "in-progress") {
      stepResult = await runOrchestrationStep(report);
      report = stepResult;
    }
  }

  const persisted = recordRun(report);

  return {
    report,
    artifactDirectory: persisted.artifactDirectory,
    artifactReportPath: persisted.artifactReportPath,
    memoryPath: persisted.memoryPath,
    overallGateStatus: report.overallGateStatus,
    currentPhase: report.currentPhase,
  };
}
