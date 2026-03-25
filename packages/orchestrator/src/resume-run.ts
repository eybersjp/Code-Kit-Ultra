import { loadRunBundle, updateRunState } from "../../memory/src/run-store";
import { executeRunBundle } from "./execution-engine";
import type { RunBundle } from "../../shared/src/types";

/**
 * Loads a run from disk and continues execution.
 * If 'approve' is true, it marks the run as approved before executing.
 */
export async function resumeRun(runId: string, approve = false, actor: string = "system"): Promise<RunBundle> {
  const bundle = loadRunBundle(runId);
  if (!bundle) {
    throw new Error(`Run not found: ${runId}`);
  }

  if (approve) {
    bundle.state.approved = true;
    bundle.state.approvalRequired = false;
    bundle.state.updatedAt = new Date().toISOString();
    updateRunState(runId, bundle.state);
  }

  // If the run was already completed or failed, we might want to prevent re-execution
  // but for Phase 8 we allow manual retry of failed steps via resume if the user fixed the environment.
  if (bundle.state.status === "completed") {
    return bundle;
  }

  return executeRunBundle(bundle, actor);
}

/**
 * Inspects a run without executing it.
 */
export function inspectRun(runId: string): RunBundle {
  const bundle = loadRunBundle(runId);
  if (!bundle) {
    throw new Error(`Run not found: ${runId}`);
  }
  return bundle;
}
