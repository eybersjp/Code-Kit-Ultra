import path from "node:path";
import { loadRunBundle, updateRunState, listRunIds } from "../../../../packages/memory/src/run-store";
import { resumeRun, retryTask, rollbackTask } from "../../../../packages/orchestrator/src/index";

const CK_RUNS_DIR = path.resolve(".codekit/runs");

export class ApprovalService {
  public static getApprovals() {
    const runIds = listRunIds();
    return runIds.map((id: string) => {
      const bundle = loadRunBundle(id);
      if (!bundle) return null;
      if (bundle.state.approvalRequired && !bundle.state.approved) {
        return {
          runId: id,
          approvalId: id,
          title: bundle.intake.idea,
          reason: bundle.state.pauseReason
        };
      }
      return null;
    }).filter((a: any) => a !== null);
  }

  public static async approve(runId: string, actor: string = "system") {
    // Phase 8: Approval triggers resume
    return resumeRun(runId, true, actor);
  }

  public static async resume(runId: string, actor: string = "system") {
    return resumeRun(runId, false, actor);
  }

  public static async retry(runId: string, stepId?: string, actor: string = "system") {
    return retryTask(runId, stepId, actor);
  }

  public static async rollback(runId: string, stepId?: string, actor: string = "system") {
    return rollbackTask(runId, stepId, actor);
  }

  public static reject(runId: string, actor: string = "system") {
    const bundle = loadRunBundle(runId);
    if (bundle) {
      bundle.state.status = "cancelled";
      bundle.state.updatedAt = new Date().toISOString();
      updateRunState(runId, bundle.state);
    }
  }
}
