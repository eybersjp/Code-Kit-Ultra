import { getQueuedBatch, updateQueuedBatchStatus } from "../../../orchestrator/src/batch-queue";
import { runActionBatch } from "../../../orchestrator/src/action-runner";
import type { CommandContext, CommandResult } from "../../../shared/src/types";

export async function handleApproveBatch(command: { args?: string[] }, context: CommandContext): Promise<CommandResult> {
  if (!context.workspaceRoot) {
    return { ok: false, message: "workspaceRoot is required for /ck-approve-batch." };
  }

  const batchId = command.args?.[0];
  if (!batchId) {
    return { ok: false, message: "Usage: /ck-approve-batch <batchId>" };
  }

  const queued = getQueuedBatch(context.workspaceRoot, batchId);
  updateQueuedBatchStatus(context.workspaceRoot, batchId, "approved");

  const result = runActionBatch({
    workspaceRoot: context.workspaceRoot,
    mode: context.mode,
    batch: queued.batch,
    approvedGates: [queued.phase],
    dryRun: false,
  });

  updateQueuedBatchStatus(context.workspaceRoot, batchId, "executed");

  return {
    ok: true,
    message: "Queued batch approved and executed.",
    data: {
      batch: queued,
      execution: result,
    },
  };
}
