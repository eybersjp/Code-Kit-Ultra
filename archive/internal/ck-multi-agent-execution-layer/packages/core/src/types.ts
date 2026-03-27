export type CKMode = "turbo" | "builder" | "pro" | "expert";

export type RunPhase =
  | "init"
  | "clarify"
  | "plan"
  | "skills"
  | "architecture"
  | "build"
  | "review"
  | "qa"
  | "security"
  | "deploy"
  | "report"
  | "done";

export interface RunRecord {
  id: string;
  mode: CKMode;
  idea: string;
  approvedGates: string[];
  currentPhase: RunPhase;
  status: "idle" | "blocked" | "awaiting_approval" | "executing" | "completed";
  context: Record<string, unknown>;
  agentSelections: Record<string, string>;
  outputs: Partial<Record<RunPhase, unknown>>;
  history: Array<{
    timestamp: string;
    phase: RunPhase | "init";
    agent?: string;
    status: string;
    message: string;
  }>;
}
