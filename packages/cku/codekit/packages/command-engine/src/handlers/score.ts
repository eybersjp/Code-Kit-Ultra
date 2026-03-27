import type { CommandContext, CommandResult } from "../../../core/src/types";
import { scoreExecution } from "../../../governance/src/confidence-engine";

export async function handleScore(command: any, _: CommandContext): Promise<CommandResult> {
  let payload: any;
  try { 
    payload = JSON.parse(command.text); 
  } catch { 
    return { ok: false, message: "Usage: /ck-score <JSON {intent,validation,constraints,consensus}>" }; 
  }
  const result = scoreExecution(payload);
  return { ok: result.overall >= 0.7, message: result.summary, data: result };
}
