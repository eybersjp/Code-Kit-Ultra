import type { CommandContext, CommandResult } from "../../../shared/src/types";
import type { BuilderActionBatch } from "../../../agents/src/action-types";
import { runActionBatch } from "../../../orchestrator/src/action-runner";

export async function handleExecute(command: { text: string }, context: CommandContext): Promise<CommandResult> {
  if (!context.runId) {
    return {
      ok: false,
      message: "No active runId. Start with /ck-init first.",
    };
  }

  if (!context.workspaceRoot) {
    return {
      ok: false,
      message: "workspaceRoot is required for /ck-execute.",
    };
  }

  let batch: BuilderActionBatch;
  try {
    batch = JSON.parse(command.text);
  } catch {
    return {
      ok: false,
      message: "Usage: /ck-execute <JSON action batch>",
    };
  }

  const result = runActionBatch({
    workspaceRoot: context.workspaceRoot,
    mode: context.mode,
    batch,
    approvedGates: [], // Start with empty approved gates
  });

  return {
    ok: true,
    message: result.summary,
    data: result,
  };
}
