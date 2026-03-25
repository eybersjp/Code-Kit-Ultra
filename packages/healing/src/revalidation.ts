import fs from "node:fs";
import type { HealingContext } from "../../shared/src/phase10_5-types";

export interface RevalidationResult {
  success: boolean;
  summary: string;
}

export async function revalidateAfterHeal(context: HealingContext): Promise<RevalidationResult> {
  if (context.adapterId === "file-system") {
    const target = String(context.payload?.["path"] ?? "");
    const exists = target ? fs.existsSync(target) : false;
    return {
      success: exists,
      summary: exists ? `Verified file path exists: ${target}` : `File path still missing: ${target}`,
    };
  }

  return {
    success: true,
    summary: `No specialized revalidation needed for adapter ${context.adapterId}.`,
  };
}
