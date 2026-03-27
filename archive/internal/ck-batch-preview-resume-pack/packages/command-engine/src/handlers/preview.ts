import { writeExecutionPreview } from "../../../orchestrator/src/execution-preview";
import type { CommandContext, CommandResult } from "../../../core/src/types";
import type { BuilderActionBatch } from "../../../agents/src/action-types";

export async function handlePreview(command: any, context: CommandContext): Promise<CommandResult> {
  if (!context.workspaceRoot) {
    return { ok: false, message: "workspaceRoot is required for /ck-preview." };
  }

  let batch: BuilderActionBatch;
  try {
    batch = JSON.parse(command.text);
  } catch {
    return { ok: false, message: "Usage: /ck-preview <JSON action batch>" };
  }

  const result = writeExecutionPreview(context.workspaceRoot, batch);
  return {
    ok: true,
    message: "Execution preview generated.",
    data: result,
  };
}
