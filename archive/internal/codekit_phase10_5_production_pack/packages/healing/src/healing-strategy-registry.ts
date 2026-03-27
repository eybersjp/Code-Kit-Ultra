import fs from "node:fs";
import path from "node:path";
import type { HealingContext, HealingResult, HealingStrategy } from "../../shared/src/phase10_5-types";

async function createMissingDirectory(context: HealingContext): Promise<HealingResult> {
  const target = String(context.payload?.["path"] ?? "");
  const dir = path.dirname(target);
  fs.mkdirSync(dir, { recursive: true });
  return {
    success: true,
    changedResources: [dir],
    notes: `Created missing parent directory for ${target}.`,
    requiresRetry: true,
    requiresReverification: true,
  };
}

async function normalizeRelativePath(context: HealingContext): Promise<HealingResult> {
  const target = String(context.payload?.["path"] ?? "");
  const normalized = path.normalize(target);
  return {
    success: true,
    changedResources: [normalized],
    notes: `Normalized path from ${target} to ${normalized}.`,
    requiresRetry: true,
    requiresReverification: true,
  };
}

async function retryTransientCommand(context: HealingContext): Promise<HealingResult> {
  return {
    success: true,
    notes: `Marked transient retry for step ${context.stepId}.`,
    requiresRetry: true,
    requiresReverification: true,
  };
}

async function suggestAllowlistedAlternative(_context: HealingContext): Promise<HealingResult> {
  return {
    success: true,
    notes: "Suggested using an allowlisted command alternative.",
    requiresRetry: false,
    requiresReverification: false,
  };
}

async function detectNoOpDiff(_context: HealingContext): Promise<HealingResult> {
  return {
    success: true,
    notes: "Detected no-op diff; safe to skip PR creation.",
    requiresRetry: false,
    requiresReverification: false,
  };
}

export function getHealingStrategies(): HealingStrategy[] {
  return [
    {
      id: "create-missing-directory",
      failureType: "path-not-found",
      adapterId: "file-system",
      title: "Create missing parent directory",
      description: "Create the parent directory before retrying the original file operation.",
      risk: "low",
      autoApply: true,
      maxAttempts: 1,
      preconditions: ["target path is writable"],
      apply: createMissingDirectory,
    },
    {
      id: "normalize-relative-path",
      failureType: "path-not-found",
      adapterId: "file-system",
      title: "Normalize relative path",
      description: "Normalize path formatting before retrying the original step.",
      risk: "low",
      autoApply: true,
      maxAttempts: 1,
      preconditions: ["path payload exists"],
      apply: normalizeRelativePath,
    },
    {
      id: "retry-transient-command",
      failureType: "network-transient",
      adapterId: "terminal",
      title: "Retry transient command once",
      description: "Retry a transient failure once after marking the step for another attempt.",
      risk: "low",
      autoApply: true,
      maxAttempts: 1,
      preconditions: ["command is allowlisted"],
      apply: retryTransientCommand,
    },
    {
      id: "suggest-allowlisted-alternative",
      failureType: "policy-blocked",
      adapterId: "terminal",
      title: "Suggest allowlisted alternative",
      description: "Suggest a safe alternative when a command is blocked by policy.",
      risk: "low",
      autoApply: false,
      maxAttempts: 1,
      preconditions: ["policy-blocked classification"],
      apply: suggestAllowlistedAlternative,
    },
    {
      id: "skip-no-op-pr",
      failureType: "verification-failed",
      adapterId: "github",
      title: "Skip PR on no-op diff",
      description: "If diff is empty, skip PR creation and mark the step as healed.",
      risk: "low",
      autoApply: false,
      maxAttempts: 1,
      preconditions: ["github diff is empty"],
      apply: detectNoOpDiff,
    },
  ];
}

export function findCandidateStrategies(failureType: string, adapterId: string): HealingStrategy[] {
  return getHealingStrategies().filter(
    (strategy) =>
      strategy.failureType === failureType &&
      (strategy.adapterId === adapterId || strategy.adapterId === "any"),
  );
}
