import type { RunPhase } from "../../core/src/types";

export type AgentRole =
  | "ceo"
  | "clarifier"
  | "planner"
  | "skillsmith"
  | "architect"
  | "builder"
  | "reviewer"
  | "qa"
  | "security"
  | "deployer"
  | "reporter";

export interface AgentContext {
  runId: string;
  mode: string;
  phase: RunPhase;
  idea: string;
  priorOutputs: Record<string, unknown>;
  runContext: Record<string, unknown>;
}

export interface AgentResult {
  agent: AgentRole;
  phase: RunPhase;
  summary: string;
  payload: unknown;
  recommendations?: string[];
}
