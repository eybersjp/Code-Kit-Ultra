import { listQueuedBatches } from "../../../orchestrator/src/batch-queue";
import type { CommandContext, CommandResult } from "../../../core/src/types";

export async function handlePending(_: any, context: CommandContext): Promise<CommandResult> {
  if (!context.workspaceRoot) {
    return { ok: false, message: "workspaceRoot is required for /ck-pending." };
  }

  const batches = listQueuedBatches(context.workspaceRoot, context.runId);
  return {
    ok: true,
    message: `Found ${batches.length} queued batch(es).`,
    data: batches,
  };
}
