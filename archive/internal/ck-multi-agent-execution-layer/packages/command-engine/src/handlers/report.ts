import { buildRunReport } from "../../../orchestrator/src/report-builder";
import type { CommandContext, CommandResult } from "../types";

export async function handleReport(_: any, context: CommandContext): Promise<CommandResult> {
  if (!context.runId) {
    return { ok: false, message: "No active runId." };
  }
  return {
    ok: true,
    message: "Run report generated",
    data: buildRunReport(context.runId),
  };
}
