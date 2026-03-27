import type { CKMode } from "../../core/src/types";

export interface CommandContext {
  mode: CKMode;
  runId?: string;
}

export interface SlashCommand {
  raw: string;
  name: string;
  args: string[];
  text: string;
}

export interface CommandResult {
  ok: boolean;
  message: string;
  data?: unknown;
}
