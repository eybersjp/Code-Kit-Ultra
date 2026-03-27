import { rollbackRun } from "../../../orchestrator/src/rollback-engine";
import type { CommandContext, CommandResult } from "../../../core/src/types";

export async function handleRollback(command: any, context: CommandContext): Promise<CommandResult> {
  if (!context.workspaceRoot) {
    return { ok: false, message: "workspaceRoot is required for /ck-rollback." };
  }

  const runId = command.args?.[0] || context.runId;
  if (!runId) {
    return { ok: false, message: "Usage: /ck-rollback <runId>" };
  }

  const result = rollbackRun(context.workspaceRoot, runId);
  return {
    ok: true,
    message: "Rollback processed.",
    data: result,
  };
}
