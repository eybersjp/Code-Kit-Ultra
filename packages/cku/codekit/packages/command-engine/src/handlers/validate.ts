import type { CommandContext, CommandResult } from "../../../core/src/types";
import type { BuilderActionBatch } from "../../../agents/src/action-types";
import { validateBatch } from "../../../governance/src/validation-engine";

export async function handleValidate(command: any, _: CommandContext): Promise<CommandResult> {
  let batch: BuilderActionBatch;
  try { 
    batch = JSON.parse(command.text); 
  } catch { 
    return { ok: false, message: "Usage: /ck-validate <JSON batch>" }; 
  }
  const result = validateBatch(batch);
  return { ok: result.valid, message: result.summary, data: result };
}
