import { buildExecutionPreview } from "../../../orchestrator/src/execution-preview";
import type { CommandContext, CommandResult } from "../../../shared/src/types";
import type { BuilderActionBatch } from "../../../agents/src/action-types";

export async function handlePreview(command: { text: string }, context: CommandContext): Promise<CommandResult> {
  let batch: BuilderActionBatch;
  try {
    batch = JSON.parse(command.text);
  } catch {
    return { ok: false, message: "Usage: /ck-preview <JSON action batch>" };
  }

  const preview = buildExecutionPreview(batch);
  return {
    ok: true,
    message: "Execution preview generated.",
    data: preview,
  };
}
