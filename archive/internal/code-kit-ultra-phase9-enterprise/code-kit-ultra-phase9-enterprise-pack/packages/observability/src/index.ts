import { loadAllRuns } from "../../memory/src/run-store";

export interface MetricsSnapshot {
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  pausedRuns: number;
  approvalPendingRuns: number;
  totalSteps: number;
  failedSteps: number;
  rolledBackSteps: number;
}

export function collectMetrics(): MetricsSnapshot {
  const runs = loadAllRuns();
  const allSteps = runs.flatMap((run) => run.executionLog.steps);
  return {
    totalRuns: runs.length,
    completedRuns: runs.filter((run) => run.state.status === "completed").length,
    failedRuns: runs.filter((run) => run.state.status === "failed").length,
    pausedRuns: runs.filter((run) => run.state.status === "paused").length,
    approvalPendingRuns: runs.filter((run) => run.state.approvalRequired).length,
    totalSteps: allSteps.length,
    failedSteps: allSteps.filter((step) => step.status === "failed").length,
    rolledBackSteps: allSteps.filter((step) => step.status === "rolled-back").length,
  };
}
