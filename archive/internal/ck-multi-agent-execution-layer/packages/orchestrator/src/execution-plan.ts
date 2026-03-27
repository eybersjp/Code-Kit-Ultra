import type { CKMode, RunPhase } from "../../core/src/types";
import { MODE_CONFIGS } from "../../core/src/mode-controller";

const ORDER: RunPhase[] = ["clarify", "plan", "skills", "architecture", "build", "review", "qa", "security", "deploy", "report"];

export interface PhaseDecision {
  phase: RunPhase;
  executionType: "auto" | "manual";
  requiresApproval: boolean;
}

export function resolveExecutionPlan(mode: CKMode): PhaseDecision[] {
  const cfg = MODE_CONFIGS[mode];
  return ORDER.map((phase) => ({
    phase,
    executionType: cfg.autoPhases.includes(phase) ? "auto" : "manual",
    requiresApproval: cfg.requireApprovalFor.includes(phase),
  }));
}
