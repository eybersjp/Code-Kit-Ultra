import type { Mode, CommandContext as SharedCommandContext, CommandResult as SharedCommandResult } from "../../shared/src/types";

export type CKMode = Mode;

export interface CommandContext extends SharedCommandContext {
  actor?: string;
}

export type CommandResult = SharedCommandResult;
