import type { CommandContext, CommandResult } from "../../../core/src/types";
import type { ConstraintPolicy } from "../../../governance/src/constraint-engine";
import { saveConstraintPolicy } from "../../../governance/src/policy-store";

export async function handleConstraints(command: any, context: CommandContext): Promise<CommandResult> {
  if (!context.workspaceRoot) return { ok: false, message: "workspaceRoot is required for /ck-constraints." };
  let policy: ConstraintPolicy;
  try { 
    policy = JSON.parse(command.text); 
  } catch { 
    return { ok: false, message: "Usage: /ck-constraints <JSON policy>" }; 
  }
  const savedPath = saveConstraintPolicy(context.workspaceRoot, context.runId || "default", policy);
  return { ok: true, message: "Constraint policy saved.", data: { savedPath, policy } };
}
