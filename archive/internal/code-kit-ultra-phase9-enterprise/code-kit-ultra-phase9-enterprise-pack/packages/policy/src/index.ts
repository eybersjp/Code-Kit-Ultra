import fs from "node:fs";
import path from "node:path";
import type { PlanTask, PolicyEvaluationResult, PolicyProfile } from "../../shared/src/types";

const defaultPolicy: PolicyProfile = {
  mode: "team-safe",
  rules: {
    requireApprovalFor: ["github"],
    maxRetries: 2,
    allowRollback: true,
    blockCommands: ["rm -rf /", "sudo rm -rf /", "mkfs"],
    requirePrReview: true,
  },
};

function policyPath(): string {
  return path.resolve("config/policy.json");
}

export function loadPolicyProfile(): PolicyProfile {
  const file = policyPath();
  if (!fs.existsSync(file)) return defaultPolicy;
  const parsed = JSON.parse(fs.readFileSync(file, "utf-8")) as Partial<PolicyProfile>;
  return {
    mode: parsed.mode ?? defaultPolicy.mode,
    rules: {
      ...defaultPolicy.rules,
      ...(parsed.rules ?? {}),
    },
  };
}

export function evaluatePolicy(task: PlanTask, policy = loadPolicyProfile()): PolicyEvaluationResult {
  if (task.adapterId === "terminal") {
    const command = String(task.payload.command ?? "");
    if (policy.rules.blockCommands.some((blocked) => command.includes(blocked))) {
      return { allowed: false, reason: `Blocked by policy: command matched '${command}'` };
    }
  }

  const requiresApproval = Boolean(task.requiresApproval) || policy.rules.requireApprovalFor.includes(task.adapterId);
  return {
    allowed: true,
    requiresApproval,
    reason: requiresApproval ? `Approval required by policy for adapter ${task.adapterId}` : "Allowed by policy",
  };
}
