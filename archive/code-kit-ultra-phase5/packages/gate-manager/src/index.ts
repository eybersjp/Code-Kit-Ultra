import type { GateDecision, GateType, Mode } from "../../shared/src/types";
import { getModePolicy } from "../../orchestrator/src/mode-controller";

export function evaluateGate(gate: GateType, mode: Mode, status: "pass" | "needs-review" | "blocked", reason: string): GateDecision {
  const policy = getModePolicy(mode);
  const shouldPause = status === "blocked" || (status === "needs-review" && policy.pauseGates.includes(gate));
  return { gate, status, reason, shouldPause };
}