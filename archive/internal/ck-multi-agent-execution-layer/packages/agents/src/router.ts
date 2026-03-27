import type { RunPhase } from "../../core/src/types";
import { PHASE_AGENT_MAP } from "./registry";
import type { AgentRole } from "./types";

export function resolveAgentForPhase(phase: RunPhase): AgentRole {
  return PHASE_AGENT_MAP[phase];
}
