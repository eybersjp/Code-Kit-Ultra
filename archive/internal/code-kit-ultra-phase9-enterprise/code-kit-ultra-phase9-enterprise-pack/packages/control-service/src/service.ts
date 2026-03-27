import { loadAuditLog } from "../../audit/src/index";
import { loadAllRuns, loadRunBundle } from "../../memory/src/run-store";
import { collectMetrics } from "../../observability/src/index";
import { loadPolicyProfile } from "../../policy/src/index";
import { inspectRun, resumeRun, retryStep, rollbackStep } from "../../orchestrator/src/index";

export function listRuns() {
  return loadAllRuns().map((run) => ({
    runId: run.state.runId,
    idea: run.intake.idea,
    status: run.state.status,
    approvalRequired: run.state.approvalRequired,
    currentStepIndex: run.state.currentStepIndex,
    updatedAt: run.state.updatedAt,
  }));
}

export function listPendingApprovals() {
  return loadAllRuns()
    .filter((run) => run.state.approvalRequired)
    .map((run) => ({
      runId: run.state.runId,
      idea: run.intake.idea,
      pauseReason: run.state.pauseReason,
      updatedAt: run.state.updatedAt,
    }));
}

export function getRun(runId: string) {
  return inspectRun(runId);
}

export function getAudit(runId: string) {
  return loadAuditLog(runId);
}

export function getPolicy() {
  return loadPolicyProfile();
}

export function getMetrics() {
  return collectMetrics();
}

export function getApproval(runId: string) {
  const run = loadRunBundle(runId);
  return {
    runId: run.state.runId,
    idea: run.intake.idea,
    approvalRequired: run.state.approvalRequired,
    pauseReason: run.state.pauseReason,
    currentStepIndex: run.state.currentStepIndex,
    pendingTask: run.plan.tasks[run.state.currentStepIndex] ?? null,
  };
}

export async function approveRun(runId: string) {
  return resumeRun(runId, true);
}

export async function resumeRunFromApi(runId: string) {
  return resumeRun(runId, false);
}

export async function retryRunStep(runId: string, stepId?: string) {
  return retryStep(runId, stepId);
}

export async function rollbackRunStep(runId: string, stepId?: string) {
  return rollbackStep(runId, stepId);
}
