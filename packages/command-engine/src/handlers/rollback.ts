import { rollbackRun } from "../../../orchestrator/src/rollback-engine";
import type { CommandContext, CommandResult } from "../../../shared/src/types";

export async function handleRollback(_: any, context: CommandContext): Promise<CommandResult> {
  if (!context.runId) {
    return { ok: false, message: "No active runId to rollback." };
  }
  if (!context.workspaceRoot) {
    return { ok: false, message: "workspaceRoot is required for rollback." };
  }

  const result = rollbackRun(context.workspaceRoot, context.runId);
  return {
    ok: true,
    message: `Rollback completed: ${result.reverted} reverted, ${result.skipped} skipped.`,
    data: result,
  };
}
