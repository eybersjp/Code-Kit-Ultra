export type CKMode = "turbo" | "builder" | "pro" | "expert";

export interface CommandContext {
  mode: CKMode;
  runId?: string;
  workspaceRoot?: string;
  actor?: string;
}

export interface CommandResult {
  ok: boolean;
  message: string;
  data?: unknown;
}
