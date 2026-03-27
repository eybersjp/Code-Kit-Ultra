import path from "path";
import type { BuilderAction } from "../../agents/src/action-types";

export type RiskLevel = "low" | "medium" | "high";

export interface ActionAssessment {
  action: BuilderAction;
  allowed: boolean;
  risk: RiskLevel;
  reason: string;
  requiresApproval: boolean;
}

const BLOCKED_COMMAND_PATTERNS = [
  /rm\s+-rf/i,
  /del\s+\/f/i,
  /shutdown/i,
  /reboot/i,
  /mkfs/i,
  /format\s+/i,
  /curl\s+.*\|\s*(sh|bash)/i,
  /wget\s+.*\|\s*(sh|bash)/i,
];

const HIGH_RISK_COMMAND_PATTERNS = [
  /git\s+push/i,
  /npm\s+publish/i,
  /pnpm\s+publish/i,
  /docker\s+push/i,
  /vercel\s+deploy/i,
  /netlify\s+deploy/i,
];

export function isSafeRelativePath(targetPath: string): boolean {
  if (!targetPath || path.isAbsolute(targetPath)) return false;
  const normalized = path.normalize(targetPath);
  if (normalized.startsWith("..")) return false;
  if (normalized.includes(".ck/")) return false;
  return true;
}

export function assessAction(action: BuilderAction): ActionAssessment {
  if (action.type === "create_dir" || action.type === "write_file" || action.type === "append_file") {
    if (!isSafeRelativePath(action.path)) {
      return {
        action,
        allowed: false,
        risk: "high",
        reason: "Path is outside workspace scope or targets protected area.",
        requiresApproval: false,
      };
    }

    return {
      action,
      allowed: true,
      risk: "low",
      reason: "Filesystem action is within workspace scope.",
      requiresApproval: false,
    };
  }

  if (action.type === "run_command") {
    for (const pattern of BLOCKED_COMMAND_PATTERNS) {
      if (pattern.test(action.command)) {
        return {
          action,
          allowed: false,
          risk: "high",
          reason: "Command matches blocked dangerous pattern.",
          requiresApproval: false,
        };
      }
    }

    for (const pattern of HIGH_RISK_COMMAND_PATTERNS) {
      if (pattern.test(action.command)) {
        return {
          action,
          allowed: true,
          risk: "high",
          reason: "Command is deploy/publish oriented and high risk.",
          requiresApproval: true,
        };
      }
    }

    return {
      action,
      allowed: true,
      risk: "medium",
      reason: "Command execution is allowed but requires review depending on mode.",
      requiresApproval: false,
    };
  }

  return {
    action,
    allowed: false,
    risk: "high",
    reason: "Unknown action type.",
    requiresApproval: false,
  };
}
