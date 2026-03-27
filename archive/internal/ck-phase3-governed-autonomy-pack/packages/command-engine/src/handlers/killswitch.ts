import type { CommandContext, CommandResult } from "../../../core/src/types";
import { evaluateKillSwitch } from "../../../governance/src/kill-switch";

export async function handleKillSwitch(command: any, _: CommandContext): Promise<CommandResult> {
  let payload: any;
  try { payload = JSON.parse(command.text); } catch { return { ok: false, message: "Usage: /ck-killswitch <JSON {confidence,constraints,consensus,threshold?}>" }; }
  const result = evaluateKillSwitch(payload);
  return { ok: !result.blocked, message: result.reason, data: result };
}
