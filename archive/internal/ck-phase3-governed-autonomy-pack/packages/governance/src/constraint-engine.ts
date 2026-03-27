import type { BuilderActionBatch } from "../../agents/src/action-types";

export interface ConstraintPolicy {
  allowedPaths?: string[];
  blockedPaths?: string[];
  blockedActionTypes?: string[];
  blockedCommandPatterns?: string[];
  maxFilesChanged?: number;
  maxCommands?: number;
  maxActions?: number;
}

export interface ConstraintViolation {
  code: string;
  message: string;
  actionIndex?: number;
}

export interface ConstraintResult {
  valid: boolean;
  violations: ConstraintViolation[];
  summary: string;
}

function pathAllowed(targetPath: string, allowedPaths?: string[], blockedPaths?: string[]): boolean {
  if (blockedPaths?.some((p) => targetPath.startsWith(p))) return false;
  if (!allowedPaths || allowedPaths.length === 0) return true;
  return allowedPaths.some((p) => targetPath.startsWith(p));
}

export function evaluateConstraints(batch: BuilderActionBatch, policy: ConstraintPolicy): ConstraintResult {
  const violations: ConstraintViolation[] = [];
  const fileActions = batch.actions.filter((a) => "path" in a);
  const commandActions = batch.actions.filter((a) => a.type === "run_command");

  if (typeof policy.maxActions === "number" && batch.actions.length > policy.maxActions) {
    violations.push({ code: "MAX_ACTIONS_EXCEEDED", message: `Batch has ${batch.actions.length} actions, exceeding maxActions=${policy.maxActions}.` });
  }
  if (typeof policy.maxFilesChanged === "number" && fileActions.length > policy.maxFilesChanged) {
    violations.push({ code: "MAX_FILES_CHANGED_EXCEEDED", message: `Batch changes ${fileActions.length} files/paths, exceeding maxFilesChanged=${policy.maxFilesChanged}.` });
  }
  if (typeof policy.maxCommands === "number" && commandActions.length > policy.maxCommands) {
    violations.push({ code: "MAX_COMMANDS_EXCEEDED", message: `Batch has ${commandActions.length} commands, exceeding maxCommands=${policy.maxCommands}.` });
  }

  batch.actions.forEach((action, index) => {
    if (policy.blockedActionTypes?.includes(action.type)) {
      violations.push({ code: "BLOCKED_ACTION_TYPE", message: `Action type '${action.type}' is blocked by policy.`, actionIndex: index + 1 });
    }
    if ("path" in action) {
      if (!pathAllowed(action.path, policy.allowedPaths, policy.blockedPaths)) {
        violations.push({ code: "PATH_NOT_ALLOWED", message: `Path '${action.path}' is not allowed by policy.`, actionIndex: index + 1 });
      }
    }
    if (action.type === "run_command" && policy.blockedCommandPatterns?.length) {
      for (const pattern of policy.blockedCommandPatterns) {
        const regex = new RegExp(pattern, "i");
        if (regex.test(action.command)) {
          violations.push({ code: "BLOCKED_COMMAND_PATTERN", message: `Command '${action.command}' matched blocked pattern '${pattern}'.`, actionIndex: index + 1 });
        }
      }
    }
  });

  return {
    valid: violations.length === 0,
    violations,
    summary: violations.length === 0 ? "Batch satisfies current constraint policy." : `Batch violates ${violations.length} constraint(s).`,
  };
}
