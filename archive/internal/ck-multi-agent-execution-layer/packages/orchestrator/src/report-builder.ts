import { getRun } from "../../core/src/run-store";

export function buildRunReport(runId: string) {
  const run = getRun(runId);
  return {
    runId: run.id,
    mode: run.mode,
    idea: run.idea,
    status: run.status,
    currentPhase: run.currentPhase,
    approvedGates: run.approvedGates,
    completedPhases: Object.keys(run.outputs),
    outputs: run.outputs,
    history: run.history,
  };
}
