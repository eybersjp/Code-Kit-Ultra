import { executeRun } from "../../../orchestrator/src/execution-coordinator";
import type { CommandContext, CommandResult } from "../types";

export async function handleRun(_: any, context: CommandContext): Promise<CommandResult> {
  if (!context.runId) {
    return { ok: false, message: "No active runId. Start with /ck-init." };
  }

  const result = await executeRun(context.runId);
  return {
    ok: true,
    message: result.message,
    data: result,
  };
}
