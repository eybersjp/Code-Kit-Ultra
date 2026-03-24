import { resumeRun } from "../../../orchestrator/src/resume-run";
import type { CommandContext, CommandResult } from "../../../shared/src/types";

export async function handleResume(_: any, context: CommandContext): Promise<CommandResult> {
  if (!context.runId) {
    return { ok: false, message: "No active runId to resume. Use /ck-run first." };
  }

  const result = await resumeRun(context.runId);
  return {
    ok: true,
    message: `Resumed run ${context.runId} at phase ${result.currentPhase}.`,
    data: result,
  };
}
