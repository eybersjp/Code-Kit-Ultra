import type { CommandContext, CommandResult } from "../../../core/src/types";
import type { BuilderActionBatch } from "../../../agents/src/action-types";
import { writeDiffPreview } from "../../../orchestrator/src/diff-preview";

export async function handleDiff(command: any, context: CommandContext): Promise<CommandResult> {
  if (!context.workspaceRoot) {
    return { ok: false, message: "workspaceRoot is required for /ck-diff." };
  }

  let batch: BuilderActionBatch;
  try {
    batch = JSON.parse(command.text);
  } catch {
    return { ok: false, message: "Usage: /ck-diff <JSON action batch>" };
  }

  const result = writeDiffPreview(context.workspaceRoot, batch);

  return {
    ok: true,
    message: "Diff preview generated.",
    data: result,
  };
}
