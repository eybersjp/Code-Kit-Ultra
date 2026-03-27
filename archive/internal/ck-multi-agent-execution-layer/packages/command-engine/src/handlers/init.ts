import { createRun } from "../../../core/src/run-store";
import type { CommandContext, CommandResult, SlashCommand } from "../types";

export async function handleInit(command: SlashCommand, context: CommandContext): Promise<CommandResult> {
  if (!command.text.trim()) {
    return { ok: false, message: "Usage: /ck-init <idea>" };
  }

  const run = createRun(context.mode, command.text.trim());
  return {
    ok: true,
    message: "Run initialized",
    data: {
      runId: run.id,
      mode: run.mode,
      nextRecommended: ["/ck-run", "/ck-status", "/ck-report"],
    },
  };
}
