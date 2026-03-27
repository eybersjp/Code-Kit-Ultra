import { getRun } from "../../../core/src/run-store";
import type { CommandContext, CommandResult } from "../types";

export async function handleStatus(_: any, context: CommandContext): Promise<CommandResult> {
  if (!context.runId) {
    return { ok: false, message: "No active runId." };
  }
  const run = getRun(context.runId);
  return {
    ok: true,
    message: "Run status loaded",
    data: {
      runId: run.id,
      mode: run.mode,
      status: run.status,
      currentPhase: run.currentPhase,
      approvedGates: run.approvedGates,
      completedPhases: Object.keys(run.outputs),
      lastHistoryItem: run.history[run.history.length - 1],
    },
  };
}
