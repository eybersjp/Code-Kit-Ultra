import { resumeRun } from "../../../orchestrator/src/resume-run";
import type { CommandContext, CommandResult } from "../../../core/src/types";

export async function handleResume(_: any, context: CommandContext): Promise<CommandResult> {
  if (!context.runId) {
    return { ok: false, message: "No active runId. Use /ck-init first." };
  }

  const result = await resumeRun(context.runId);
  return {
    ok: true,
    message: "Run resumed.",
    data: result,
  };
}
