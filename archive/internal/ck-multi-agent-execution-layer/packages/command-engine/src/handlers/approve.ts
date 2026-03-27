import { approveGate } from "../../../core/src/run-store";
import type { CommandContext, CommandResult, SlashCommand } from "../types";

export async function handleApprove(command: SlashCommand, context: CommandContext): Promise<CommandResult> {
  if (!context.runId) {
    return { ok: false, message: "No active runId." };
  }

  const gate = command.args[0];
  if (!gate) {
    return { ok: false, message: "Usage: /ck-approve <phase-or-gate>" };
  }

  const run = approveGate(context.runId, gate);
  return {
    ok: true,
    message: `Approved ${gate}`,
    data: {
      runId: run.id,
      approvedGates: run.approvedGates,
    },
  };
}
