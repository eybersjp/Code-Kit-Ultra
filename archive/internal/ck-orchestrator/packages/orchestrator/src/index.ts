
import { evaluateGates } from "../../gates/src/gate-engine";
import { getRun } from "../../core/src/state-store";

export function runOrchestrator(runId: string) {
  const run = getRun(runId);
  const results = evaluateGates(run.data, run.mode);

  const blocking = results.filter(r => r.blocking && !r.passed);
  const approvals = results.filter(r => r.requiresApproval && !run.approvedGates.includes(r.gate));

  if (blocking.length > 0) {
    return {
      status: "blocked",
      blocking
    };
  }

  if (approvals.length > 0) {
    return {
      status: "awaiting_approval",
      approvals
    };
  }

  return {
    status: "executing",
    message: "All gates passed. Executing pipeline..."
  };
}
